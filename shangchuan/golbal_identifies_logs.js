//记录一个web页面中所有script代码中定义的全局变量，记录到identifies_logs.txt中

const tif = require("./typeInferFast");
const fs = require("fs");
const path = require('path');
const process = require('process');


// 指定目录路径
//const directoryPath = 'E:/Procedure/lunWen/EsLint_test/test/ssb/script';

function getLogs(directoryPath){

  // 获取当前时间
  const startTime = process.hrtime();

  // 读取目录中的所有文件
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    // 打印所有文件名
    files.forEach(file => {
      let arr = file.split('.')[0].split('_');
      let frameID = arr[1];
      let scriptID = arr[3];
      try{
        tif.typeInferFast(directoryPath + '/' + file, frameID, scriptID);
      }catch(err){
        console.log(err.message);
      }
    });
    console.log('log记录结束');
    // 获取结束时间
    const endTime = process.hrtime(startTime);
    // 计算经过的时间（以毫秒为单位）
    const elapsedTime = (endTime[0] * 1000 + endTime[1] / 1e6) / 1000;
    fs.writeFileSync(`${path.dirname(directoryPath)}/time.txt`, `全局标识符分析+类型推断花费时间: ${elapsedTime} s\n`, { flag: 'a+' });
  });
}

module.exports = {
    getLogs,
};