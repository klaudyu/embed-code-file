import { Plugin, MarkdownRenderer, TFile, MarkdownPostProcessorContext, MarkdownView, parseYaml, requestUrl,Platform,normalizePath} from 'obsidian';
import { EmbedCodeFileSettings, EmbedCodeFileSettingTab, DEFAULT_SETTINGS} from "./settings";
import { analyseSrcLines, extractSrcLinesWithNumbers,getAbsolutePathOfFolder} from "./utils";



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
		
		
		const activeLeaf = this.app.workspace.activeLeaf;

		// Check if activeLeaf and view exist
		if (activeLeaf?.view) {
		  // Type assertion to treat view as any type to access file
		  const activeFile = (activeLeaf.view as any).file as TFile;

		  // Check if activeFile exists
		  if (activeFile) {
			// Close the active file
			activeLeaf.detach();

			// Reopen the file after a short delay
			setTimeout(() => {
			  this.app.workspace.openLinkText(activeFile.basename, activeFile.path, true);
			}, 100); // Adjust the delay as needed
		  }
		}


		
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
            console.log(metaYaml.LINES)
			if (srcLinesNumString) {
				srcLinesNum = analyseSrcLines(srcLinesNumString,fullSrc)
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
					 <span class="code-line-number">${ this.settings.showLineNumbers?(lineNumbers[index] !== undefined ? (lineNumbers[index] !== -1 ? `${lineNumbers[index]}:` : '  ') : ''):''}</span>
					 <span class="code-line">${line}</span>
				   </div>`
				).join('');




				// Replace the innerHTML of the code block with the wrapped highlighted code
				codeBlock.innerHTML = wrappedHighlightedCode;
			}
			
			/*
			const codeElm = el.querySelector('pre > code')
			if (!codeElm) { return }
			const pre = codeElm.parentElement as HTMLPreElement;

			this.insertTitlePreElement(pre, title)
			*/
			const codeElm = el.querySelector('pre > code');
			if (!codeElm) { return }
			const pre = codeElm.parentElement as HTMLPreElement;
			
			const newDiv  = document.createElement("div");
			newDiv.className = "obsidian-embed-code-title-wrapper";
			
			
			const titleaslink=this.settings.openDefaultApp
			this.addLinkLivePreview(pre       ,title, srcPath,"title","system",titleaslink);

			if(this.settings.openObsidian){
				this.addLinkLivePreview(newDiv,"💎️", srcPath,"option","obsidian");
			}
			if (this.settings.openConsole){
				this.addLinkLivePreview(newDiv, "⌨️",srcPath,"option","console");
			}
			if (this.settings.openExplorer){
				this.addLinkLivePreview(newDiv,"📂", srcPath,"option","explorer");
			}
			if (this.settings.openTotalCmd){
				this.addLinkLivePreview(newDiv,"💾", srcPath,"option","totalcmd");
			}
					
			pre.appendChild(newDiv);
			el.className += ' embed-code-file-plugin';
		});
	}

	addLinkLivePreview(div: HTMLElement, title: string, srcPath: string, thetype: string, command: string,link:boolean = true) {
		
		const path = require('path'); // Make sure to import the path module
		const { exec } = require("child_process");


		/*
		const codeElm = el.querySelector('pre > code');
		if (!codeElm) { return }
		const pre = codeElm.parentElement as HTMLPreElement;
		*/
		
		var run = ()=>{};
		//it's a webpage
		if (srcPath.startsWith('http://') || srcPath.startsWith('https://')){
			switch (command){
				case "console":
				case "totalcmd":
					return;
				default:
					let url = srcPath.startsWith('https://raw.githubusercontent')?this.convertRawToRepoURL(srcPath):srcPath
					run=()=>{require('electron').shell.openExternal(url)};
			}
		//it's a file
		}else{
			const fileToOpen = this.app.vault.getAbstractFileByPath(srcPath);
			if(!fileToOpen){return }
			const filePath = fileToOpen.path;

			const fileAbsolutePath = getAbsolutePathOfFolder(filePath); 
			const folderPath = path.dirname(fileAbsolutePath);
			
			switch (command) {
			  // Open in default app
			  case "system":
				switch (process.platform) {
				  case "win32":
					run = () => {exec(`start "" "${fileAbsolutePath}"`)};break;
				  case "darwin":
					run = () => {exec(`open "${fileAbsolutePath}"`)};break;
				  default: // Linux
					run = () => {exec(`xdg-open "${fileAbsolutePath}"`)};break;
				}
				break;
				
			  //open in obsidian
			  case "obsidian":
				run = () => this.app.workspace.openLinkText(fileToOpen.name, fileToOpen.path, false);
				break;
				
			  // Open in console
			  case "console":			
				switch (process.platform) {
				  case "win32":
					const driveLetter = folderPath.charAt(0);
					run = () => {exec(`start cmd.exe /K "${driveLetter}: && cd \"${folderPath}\" && powershell.exe"`)};break;
				  case "darwin":
					run =  () => {exec(`open -a Terminal "${folderPath}"`)};break;
				  default: // Linux
					run = () => {exec(`gnome-terminal --working-directory=${folderPath}`)};break;
				}
				break;

			  // Open in explorer
			  case "explorer":
				switch (process.platform) {
				  case "win32":
					run = () => {exec(`explorer /select,"${fileAbsolutePath}"`)};break;
				  case "darwin":
					run = () =>{exec(`open -R "${fileAbsolutePath}"`)};break;
				  default: // Linux
					run = () => {exec(`nautilus "${filePath}"`)};break;
				}
				break;
			  //open in totalcmd
			  case "totalcmd":
				if (process.platform == "win32"){
					run = () => {exec(`start totalcmd "/O" "/T" "/S"  "${fileAbsolutePath}"`);}
				}
				break;
			}
		}




		// Create a clickable div element
		const titleDiv = document.createElement("pre");
		titleDiv.textContent = title;
		titleDiv.className = "obsidian-embed-code "+thetype+" "+command;
		
		

		titleDiv.style.color = this.settings.titleFontColor;
		titleDiv.style.backgroundColor = this.settings.titleBackgroundColor;

		if(link){
			if(thetype!="option"){
				// Add hover behavior
				titleDiv.addEventListener("mouseover", () => {
					titleDiv.style.textDecoration = "none";  // Remove underline on hover
				});
				titleDiv.addEventListener("mouseout", () => {
					titleDiv.style.textDecoration = "underline";  // Add underline back when hover ends
				});
				titleDiv.style.textDecoration = "underline";  // Mimic hyperlink underline

			}
			
			titleDiv.style.cursor = "pointer";  // Change cursor to pointer on hover
			titleDiv.setAttribute("title", "open with " + command);  // Add this line for the tooltip


			// Add click event to open the file in Obsidian or a URL in the browser
			titleDiv.addEventListener("click", () => {
			  if (run){run()}
			});
		}

		// Add the clickable div to the pre element
		 //pre.style.position = "relative";  // Make sure the parent is relative

		div.insertBefore(titleDiv,div.firstChild);
		//this.insertTitlePreElement(pre, title)

		}
	
	convertRawToRepoURL(rawURL: string): string {
		  // Replace 'raw.githubusercontent.com' with 'github.com'
		  let repoURL = rawURL.replace("raw.githubusercontent.com", "github.com");

		  // Insert '/blob' between the repository name and the branch name
		  const parts = repoURL.split("/");
		  parts.splice(5, 0, "blob");
		  repoURL = parts.join("/");

		  return repoURL;
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
