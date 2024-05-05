const fs = require('fs');
const path = require('path');
const htmlparser2 = require('htmlparser2');
const axios = require('axios');
const { PassThrough } = require('stream');
const { resolve } = require('path');
const { reject } = require('lodash');
const process = require('process');

//let sourceFile = 'E:/Procedure/lunWen/EsLint_test/test/ssb/ssb.html';
//let sourceFile = 'C:/Users/Administrator/Desktop/ceshi.html';
let sourcePath;

// scriptID scriptName scriptPosition
const iframe = [];
let iframeID = 1;
const iframeStack = [1];
let currentIframeID = iframeStack[iframeStack.length - 1];
const scriptTags = [];
let currentScriptContent = undefined;

//get_script_htmlparser(sourceFile, 1);

// 传入html文件路径，找到html中所有的script
function get_script_htmlparser(sourceFile, folderName, frameFileID){
  const startTime = process.hrtime();
  let scriptID = 1;
  // 读取 HTML 文件内容
  const htmlContent = fs.readFileSync(sourceFile, 'utf-8');
  sourcePath = path.dirname(sourceFile);

  // 使用 htmlparser2 解析 HTML
  const parser = new htmlparser2.Parser({
    onopentag(name, attributes) {
      if (name === 'script') {
        console.log(`Script tag start index: ${parser.startIndex}`);
        let src = null;
        if (attributes.src)
          src = attributes.src;
        scriptTags.push({
          scriptID: null,
          scriptURL: src,
          start: parser.startIndex,
          end: null,
          iframeID:  frameFileID
        });
        currentScriptContent = '';
      }
      //if (name === 'iframe') {
        //iframeID += 1;
        //iframeStack.push(iframeID);
        //currentIframeID = iframeStack[iframeStack.length - 1];
        //let src = null;
        //if (attributes.src){
          //src = attributes.src;

        //}
        //iframe.push({
          //iframeID: null,
          //iframeURL: src,
          //start: parser.startIndex,
          //end: null
        //});
      //}
    },
    ontext(text) {
      // 如果当前在处理 <script> 标签内，将文本内容追加到当前脚本内容字符串
      if (currentScriptContent !== undefined) {
        currentScriptContent += text;
      }
    },
    onclosetag(name) {
      if (name === 'script') {
        console.log(`Script tag end index: ${parser.endIndex}`);
        const lastScriptTag = scriptTags.pop();
        lastScriptTag.end = parser.endIndex;
        lastScriptTag.scriptID = scriptID;
        console.log(lastScriptTag);
        // 将js代码的位置信息写入文件
        const outputFilePath = `${sourcePath}/${folderName}/scriptPosition.txt`;
        fs.writeFileSync(outputFilePath, JSON.stringify(lastScriptTag, null, 0) + '\n', { flag: 'a+' });
        console.log(`Script tag positions have been written to ${outputFilePath}`);

        // 将js代码写入文件，script_id.js
        const scriptFilePath = `${sourcePath}/${folderName}/script/frame_${frameFileID}_script_${scriptID}` + '.js';
        // 检测网站
        if (lastScriptTag.scriptURL !== null) {
          let axiosUrl = '';
          if (startsWithHttpOrDoubleSlash(lastScriptTag.scriptURL)) {
            axiosUrl = lastScriptTag.scriptURL;
          }else {
            axiosUrl = readFirstLineSync(sourceFile) + lastScriptTag.scriptURL;
          }
          axios.get(axiosUrl, { timeout: 5000 })
            .then(response => {
              // 处理页面源码
              fs.writeFileSync(scriptFilePath, response.data, 'utf8');
            })
            .catch(error => {
              // 处理错误
              console.error(`Error during axios 访问链接：${axiosUrl}:`, error.message);
            });
          //if (isURLOrFilePath(lastScriptTag.scriptURL) == 'URL') {
            //console.log('目前请求的url：' + lastScriptTag.scriptURL);
            //axios.get(lastScriptTag.scriptURL, { timeout: 5000 })
              //.then(response => {
                //// 处理页面源码
                //fs.writeFileSync(scriptFilePath, response.data, 'utf8');
              //})
              //.catch(error => {
                //// 处理错误
                //console.error('Error during axios operation:', error);
              //});
          //} else {
            //console.log('目前请求的url：http:' + lastScriptTag.scriptURL);
            //axios.get('http:' + lastScriptTag.scriptURL, { timeout: 5000 })
              //.then(response => {
                //// 处理页面源码
                //fs.writeFileSync(scriptFilePath, response.data, 'utf8');
              //})
              //.catch(error => {
                //// 处理错误
                //console.error('Error during axios operation:', error);
              //});
          //}
        } else {
          fs.writeFileSync(scriptFilePath, currentScriptContent, 'utf8');
          console.log(`Script content saved to ${scriptFilePath}`);
        }
        ////本地检测
        //if (lastScriptTag.scriptURL !== null) {
          //if (isURLOrFilePath(lastScriptTag.scriptURL) == 'URL') {
            //console.log('url');
            //axios.get(lastScriptTag.scriptURL)
              //.then(response => {
                //// 处理页面源码
                //fs.writeFileSync(scriptFilePath, response.data, 'utf8');
              //})
              //.catch(error => {
                //// 处理错误
                //console.error('Error during axios operation:', error);
              //});
          //} else {
            //if (path.isAbsolute(lastScriptTag.scriptURL))
              //copyFile(lastScriptTag.scriptURL, scriptFilePath);
            //else
              //copyFile(sourcePath + '/' + lastScriptTag.scriptURL, scriptFilePath);
          //}
        //} else {
          //fs.writeFileSync(scriptFilePath, currentScriptContent, 'utf8');
          //console.log(`Script content saved to ${scriptFilePath}`);
        //}

        scriptID += 1;
        // 清空当前脚本内容字符串
        currentScriptContent = undefined;
        console.log('--------------------------');
      }
      //if (name === 'iframe') {
        //const lastiframe = iframe.pop();
        //lastiframe.end = parser.endIndex;
        //lastiframe.iframeID = iframeID;
        //console.log(lastiframe);
        //// 将iframe代码的位置信息写入文件
        //const outputFilePath = `${sourcePath}/${folderName}/scriptPosition.txt`;
        //fs.writeFileSync(outputFilePath, JSON.stringify(lastiframe, null, 0) + '\n', { flag: 'a+' });

        //// 将iframe代码写入文件，frame_id.html
        //const scriptFilePath = `${sourcePath}/${folderName}/frame_${currentIframeID}.html`;
        //if (lastiframe.iframeURL !== null) {
          //if (isURLOrFilePath(lastiframe.iframeURL) == 'URL') {
            //axios.get(lastiframe.iframeURL)
              //.then(response => {
                //// 处理页面源码
                //fs.writeFileSync(scriptFilePath, response.data, 'utf8');
                //get_script_htmlparser(scriptFilePath, iframeID);
              //})
              //.catch(error => {
                //// 处理错误
                //console.error('Error during axios operation:', error);
              //});
          //} else {
            //if (path.isAbsolute(lastiframe.iframeURL))
              //copyFile(lastiframe.iframeURL, scriptFilePath, iframeID);
            //else
              //copyFile(sourcePath + '/' + lastiframe.iframeURL, scriptFilePath, iframeID);
          //}

        //}
        //iframeStack.pop();
        //currentIframeID = iframeStack[iframeStack.length - 1];
      //}
    },
  });

  parser.write(htmlContent);
  parser.end();

  // 获取结束时间
  const endTime = process.hrtime(startTime);
  // 计算经过的时间（以毫秒为单位）
  const elapsedTime = (endTime[0] * 1000 + endTime[1] / 1e6) / 1000;
  console.log(`检测script花费时间: ${elapsedTime} s`);
  const timeFile = `${sourcePath}/${folderName}/time.txt`;
  fs.writeFileSync(timeFile, `检测script花费时间: ${elapsedTime} s\n`, { flag: 'a+' });

}

//判断src是url还是文件路径
function isURLOrFilePath(str) {
  // 判断是否为URL
  const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/i;
  if (urlRegex.test(str)) {
    return 'URL';
  } else {
    return 'FilePath';
  }
}

// 判断一个url是不是绝对url
function startsWithHttpOrDoubleSlash(str) {
  // 使用正则表达式检查是否以 "http://"、"https://" 或 "//" 开头
  return /^(http:\/\/|https:\/\/|\/\/)/.test(str);
}

// 读取文件第一行的内容
function readFirstLineSync(filePath) {
  try {
    // 同步读取文件内容
    const content = fs.readFileSync(filePath, 'utf-8');

    // 按行拆分
    const lines = content.split('\n');

    // 获取第一行内容
    const firstLine = lines[0];

    // 输出结果
    return firstLine;
  } catch (error) {
    console.error('读文件第一行内容出错：', error.message);
  }
}

// 复制文件,并分析出文件的script代码
function copyFile(sourcePath, destinationPath, frameFileID) {
  // 创建可读流
  const readStream = fs.createReadStream(sourcePath);

  // 创建可写流
  const writeStream = fs.createWriteStream(destinationPath);

  // 将可读流的内容通过管道传递给可写流
  readStream.pipe(writeStream);

  // 监听流结束事件
  writeStream.on('finish', () => {
    //get_script_htmlparser(destinationPath, frameFileID);
  });

  // 监听可能的错误事件
  readStream.on('error', (err) => {
    console.error(`Error reading file ${sourcePath}: ${err}`);
  });

  writeStream.on('error', (err) => {
    console.error(`Error writing file ${destinationPath}: ${err}`);
  });
}
// 判断一个文件是否存在
function checkFileExistence(filePath) {
  try {
    // 使用 fs.accessSync 同步方法检查文件是否存在
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
    get_script_htmlparser,
};