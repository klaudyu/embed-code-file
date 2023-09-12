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

