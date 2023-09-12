import path from "path";
import { normalizePath, Platform} from 'obsidian';


export function pathJoin(dir: string, subpath: string): string {
  const result = path.join(dir, subpath);
  // it seems that obsidian do not understand paths with backslashes in Windows, so turn them into forward slashes
  return result.replace(/\\/g, "/");
}

export function getAbsolutePathOfFolder(inputpath: string): string {
	  //@ts-ignore
	  const outpath = normalizePath(`${this.app.vault.adapter.basePath}/${inputpath}`)
	  if (Platform.isDesktopApp && navigator.platform === "Win32") {
		return outpath.replace(/\//g, "\\");
	  }
	  return outpath;
	}

export function extractSrcLinesWithNumbers(fullSrc: string, srcLinesNum: number[]): {lines: string[], lineNumbers: number[]} {
  let lines = fullSrc.split('\n');
  let extractedLines: string[] = [];
  let originalLineNumbers: number[] = [];
  let prevLineNum = 0;

  const addEllipsis = () => {
    extractedLines.push('....', '');
    originalLineNumbers.push(-1, -1);
  };

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

  if (prevLineNum < lines.length) {
    addEllipsis();
  }

  return {lines: extractedLines, lineNumbers: originalLineNumbers};
}

export function analyseSrcLines(str: string | string[], code: string): number[] {
  const result: number[] = [];

  const processStr = (s: string) => {
    s = s.replace(/\s*/g, "");

    if (s.startsWith('match:')) {
      const regexPattern = s.slice(6);
      const regex = new RegExp(regexPattern, 'gm');
      let match;
      let startLine = 0;
      let endLine = 0;

      const lines = code.split('\n');

      while ((match = regex.exec(code)) !== null) {
        startLine = code.substring(0, match.index).split('\n').length;
        endLine = startLine + match[0].split('\n').length - 1;

        for (let i = startLine; i <= endLine; i++) {
          result.push(i);
        }
        result.push(0); // three dots
      }
    } else {
      const strs = s.split(",");
      strs.forEach(it => {
        if(/\w+-\w+/.test(it)) {
          let [left, right] = it.split('-').map(Number);
          for(let i = left; i <= right; i++) {
            result.push(i);
          }
          result.push(0); // three dots
        } else {
          result.push(Number(it));
          result.push(0); // three dots
        }
      });
    }
  };

  if (Array.isArray(str)) {
    str.forEach(s => processStr(s));
  } else {
    processStr(str);
  }

  return result;
}


export function __analyseSrcLines(str: string, code: string): number[] {
  str = str.replace(/\s*/g, "");
  const result: number[] = [];

  // Check if the string starts with 'match:'
  if (str.startsWith('match:')) {
    const regexPattern = str.slice(6); // Remove 'match:' prefix
    const regex = new RegExp(regexPattern, 'gm'); // 'm' flag for multi-line
    let match;
    let startLine = 0;
    let endLine = 0;

    // Split the code into lines
    const lines = code.split('\n');

    // Loop through the code to find multi-line matches
    while ((match = regex.exec(code)) !== null) {
      startLine = code.substring(0, match.index).split('\n').length;
      endLine = startLine + match[0].split('\n').length - 1;

      for (let i = startLine; i <= endLine; i++) {
        result.push(i);
      }
      result.push(0); // three dots
    }
  } else {
    // Existing logic for handling ranges and individual numbers
    const strs = str.split(",");
    strs.forEach(it => {
      if(/\w+-\w+/.test(it)) {
        let [left, right] = it.split('-').map(Number);
        for(let i = left; i <= right; i++) {
          result.push(i);
        }
        result.push(0); // three dots
      } else {
        result.push(Number(it));
        result.push(0); // three dots
      }
    });
  }

  return result;
}



export function _analyseSrcLines(str: string): number[] {
	str = str.replace(/\s*/g, "")
	const result: number[] = []

	let strs = str.split(",")
	strs.forEach(it => {
		if(/\w+-\w+/.test(it)) {
			let left = Number(it.split('-')[0])
			let right = Number(it.split('-')[1])
			for(let i = left; i <= right; i++) {
				result.push(i)
			}
			result.push(0) // three dots
		} else {
			result.push(Number(it))
			result.push(0) // three dots
		}
	})

	return result
}

export function extractSrcLines(fullSrc: string,  srcLinesNum: number[]): string {
    let src = ""

    const fullSrcLines = fullSrc.split("\n")
	const fullSrcLinesLen = fullSrcLines.length

	srcLinesNum.forEach((lineNum, index, arr) => {
		if (lineNum > fullSrcLinesLen) {
		  arr.splice(index, 1);
		}
	});

	srcLinesNum.forEach((lineNum, index, arr) => {
		if (lineNum == 0 && arr[index-1] == 0) {
		  arr.splice(index, 1);
		}
	});
	
    srcLinesNum.forEach((lineNum, index) => {
		if (lineNum > fullSrcLinesLen) {
			return
		}

		if (index == srcLinesNum.length-1 && lineNum == 0 && srcLinesNum[index-1] == fullSrcLinesLen) {
			return
		} 

		if (index == 0 && lineNum != 1) {
			src = '...' + '\n' + fullSrcLines[lineNum-1]
			return
		}
		
		// zeros is dots (analyseSrcLines)
        if (lineNum == 0 ) {
			src = src + '\n' + '...'
			return
		}

		if (index == 0) {
			src = fullSrcLines[lineNum-1]
		} else {
			src = src + '\n' + fullSrcLines[lineNum-1]
		}
	});

    return src
}

