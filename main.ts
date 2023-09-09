import { Plugin, MarkdownRenderer, TFile, MarkdownPostProcessorContext, MarkdownView, parseYaml, requestUrl} from 'obsidian';
import { EmbedCodeFileSettings, EmbedCodeFileSettingTab, DEFAULT_SETTINGS} from "./settings";
import { analyseSrcLines, extractSrcLines} from "./utils";


function extractSrcLinesWithNumbers(fullSrc: string, srcLinesNum: number[]): {lines: string[], lineNumbers: number[]} {
  let lines = fullSrc.split('\n');
  let extractedLines: string[] = [];
  let originalLineNumbers: number[] = [];
  let prevLineNum = 0;

  // Function to add ellipsis
  const addEllipsis = () => {
	extractedLines.push('....');
    extractedLines.push('');
    originalLineNumbers.push(-1);
	originalLineNumbers.push(-1);
  };

  // Check for ellipsis at the beginning
  if (!srcLinesNum.includes(1)) {
    addEllipsis();
  }

  for (let i = 0; i < lines.length; i++) {
    let currentLineNum = i + 1;

    if (srcLinesNum.includes(currentLineNum)) {
      if (prevLineNum !== 0 && currentLineNum !== prevLineNum + 1) {
        addEllipsis();
      }
      extractedLines.push(lines[i]);
      originalLineNumbers.push(currentLineNum);
      prevLineNum = currentLineNum;
    }
  }

  // Check for ellipsis at the end
  if (prevLineNum < lines.length) {
    addEllipsis();
  }

  return {lines: extractedLines, lineNumbers: originalLineNumbers};
}





export default class EmbedCodeFile extends Plugin {
	settings: EmbedCodeFileSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new EmbedCodeFileSettingTab(this.app, this));

		this.registerMarkdownPostProcessor((element, context) => {
			this.addTitle(element, context);
		});

		// live preview renderers
		const supportedLanguages = this.settings.includedLanguages.split(",")
		supportedLanguages.forEach(l => {
			console.log(`registering renderer for ${l}`)
			this.registerRenderer(l)
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async registerRenderer(lang: string) {
		this.registerMarkdownCodeBlockProcessor(`embed-${lang}`, async (meta, el, ctx) => {
			let fullSrc = ""
			let src = ""

			let metaYaml: any
			try {
				metaYaml = parseYaml(meta)
			} catch(e) {
				await MarkdownRenderer.renderMarkdown("`ERROR: invalid embedding (invalid YAML)`", el, '', this)
				return
			}

			let srcPath = metaYaml.PATH
			if (!srcPath) {
				await MarkdownRenderer.renderMarkdown("`ERROR: invalid source path`", el, '', this)
				return
			}

			if (srcPath.startsWith("https://") || srcPath.startsWith("http://")) {
				try {
					let httpResp = await requestUrl({url: srcPath, method: "GET"})
					fullSrc = httpResp.text
				} catch(e) {
					const errMsg = `\`ERROR: could't fetch '${srcPath}'\``
					await MarkdownRenderer.renderMarkdown(errMsg, el, '', this)
					return
				}
			} else if (srcPath.startsWith("vault://")) {
				srcPath = srcPath.replace(/^(vault:\/\/)/,'');

				const tFile = app.vault.getAbstractFileByPath(srcPath)
				if (tFile instanceof TFile) {
					fullSrc = await app.vault.read(tFile)
				} else {
					const errMsg = `\`ERROR: could't read file '${srcPath}'\``
					await MarkdownRenderer.renderMarkdown(errMsg, el, '', this)
					return
				}
			} else {
				const errMsg = "`ERROR: invalid source path, use 'vault://...' or 'http[s]://...'`"
				await MarkdownRenderer.renderMarkdown(errMsg, el, '', this)
				return
			}

			let srcLinesNum: number[] = []
			const srcLinesNumString = metaYaml.LINES
			if (srcLinesNumString) {
				srcLinesNum = analyseSrcLines(srcLinesNumString)
			}


			let title = metaYaml.TITLE
			if (!title) {
				title = srcPath
			}

			let lines: string[] = [];
			let lineNumbers: number[] = [];

			if (srcLinesNum.length == 0) {
			  src = fullSrc;
			  lines = fullSrc.split('\n');
			  lineNumbers = Array.from({ length: lines.length }, (_, i) => i + 1);  // Generate line numbers from 1 to N
			} else {
			  let extracted = extractSrcLinesWithNumbers(fullSrc, srcLinesNum);
			  lines = extracted.lines;
			  lineNumbers = extracted.lineNumbers;
			  src = lines.join('\n');
			}

			await MarkdownRenderer.renderMarkdown('```' + lang + '\n' + src + '\n```', el, '', this);

			// Find the rendered code block
			const codeBlock = el.querySelector('pre > code');
			if (codeBlock) {
				// Get the existing highlighted code
				const highlightedCode = codeBlock.innerHTML;

				// Split the highlighted code by new lines and wrap each line in a div
				const wrappedHighlightedCode = highlightedCode.split('\n').map((line, index) => 
				  `<div class="code-line-container">
					 <span class="code-line-number">${lineNumbers[index] !== undefined ? (lineNumbers[index] !== -1 ? `${lineNumbers[index]}:` : '  ') : ''}</span>
					 <span class="code-line">${line}</span>
				   </div>`
				).join('');




				// Replace the innerHTML of the code block with the wrapped highlighted code
				codeBlock.innerHTML = wrappedHighlightedCode;
			}

			this.addTitleLivePreview(el, title,srcPath);
			el.className += ' embed-code-file-plugin';
		});
	}

addTitleLivePreview(el: HTMLElement, title: string, srcPath: string) {
    const codeElm = el.querySelector('pre > code');
    if (!codeElm) { return }
    const pre = codeElm.parentElement as HTMLPreElement;

	// Create a clickable div element
	const titleDiv = document.createElement("span");
	titleDiv.textContent = title;
	titleDiv.className = "obsidian-embed-code-file";
	titleDiv.style.color = "blue";  // Mimic hyperlink color
	titleDiv.style.textDecoration = "underline";  // Mimic hyperlink underline
	titleDiv.style.cursor = "pointer";  // Change cursor to pointer on hover

	// Add hover behavior
	titleDiv.addEventListener("mouseover", () => {
		titleDiv.style.textDecoration = "none";  // Remove underline on hover
	});
	titleDiv.addEventListener("mouseout", () => {
		titleDiv.style.textDecoration = "underline";  // Add underline back when hover ends
	});

	// Add click event to open the file in Obsidian or a URL in the browser
	titleDiv.addEventListener("click", () => {
	  if (srcPath.startsWith('http://') || srcPath.startsWith('https://')) {
		// Open URL in the default web browser
		require('electron').shell.openExternal(srcPath);
	  } else {
		// Open local file in Obsidian
		const fileToOpen = this.app.vault.getAbstractFileByPath(srcPath);
		if (fileToOpen instanceof TFile) {
		  this.app.workspace.openLinkText(fileToOpen.name, fileToOpen.path, false);
		}
	  }
	});


	// Add the clickable div to the pre element
	pre.prepend(titleDiv);

}



	addTitle(el: HTMLElement, context: MarkdownPostProcessorContext) {
		// add some commecnt 
		let codeElm = el.querySelector('pre > code')
		if (!codeElm) {
			return
		}

		const pre = codeElm.parentElement as HTMLPreElement;

		const codeSection = context.getSectionInfo(pre)
		if (!codeSection) {
			return
		}

		const view = app.workspace.getActiveViewOfType(MarkdownView)
		if (!view) {
			return
		}

		const num = codeSection.lineStart
		const codeBlockFirstLine = view.editor.getLine(num)

		let matchTitle = codeBlockFirstLine.match(/TITLE:\s*"([^"]*)"/i)
		if (matchTitle == null) {
			return
		}

		const title = matchTitle[1]
		if (title == "") {
			return
		}

		this.insertTitlePreElement(pre, title)
	}

	insertTitlePreElement(pre: HTMLPreElement, title: string) {
		pre
		.querySelectorAll(".obsidian-embed-code-file")
		.forEach((x) => x.remove());

		let titleElement = document.createElement("pre");
		titleElement.appendText(title);
		titleElement.className = "obsidian-embed-code-file";
		titleElement.style.color = this.settings.titleFontColor;
		titleElement.style.backgroundColor = this.settings.titleBackgroundColor;
		pre.prepend(titleElement);
	}
}
