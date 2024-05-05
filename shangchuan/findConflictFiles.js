const fs = require('fs');
const path = require('path');

// 指定根目录
const rootDirectory = 'C:/Users/Administrator/Desktop/test/'; // 请替换为实际的文件夹路径

// 目标文件名
const targetFileName = 'conflict.txt';

// 递归遍历目录
function findDirectories(directoryPath, targetFileName, result) {
  const files = fs.readdirSync(directoryPath);

  files.forEach(file => {
    const filePath = path.join(directoryPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      // 如果是文件夹，递归查找
      findDirectories(filePath, targetFileName, result);
    } else if (stats.isFile() && file === targetFileName) {
      // 如果是目标文件，将其所在的文件夹路径添加到结果中
      result.push(directoryPath);
    }
  });
}

// 存储结果的数组
const resultDirectories = [];

// 开始查找
findDirectories(rootDirectory, targetFileName, resultDirectories);

// 打印结果
let filePath = 'C:/Users/Administrator/Desktop/test/findConflict.txt';
// 将数组元素转换为字符串并逐行写入文件
const arrayAsString = resultDirectories.map(String).join('\n');
fs.writeFileSync(filePath, arrayAsString, 'utf-8');
