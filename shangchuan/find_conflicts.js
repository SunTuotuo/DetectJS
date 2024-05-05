const fs = require('fs');
const readline = require('readline');
const process = require('process');
const path = require('path');

function find_conflicts(filePath, outputFilePath) {

    const startTime = process.hrtime();
    // 冲突结果输出到conflict.txt中
    //const outputFilePath = 'E:/Procedure/lunWen/EsLint_test/test/ssb/conflict.txt';
    // 指定txt文件路径
    //const filePath = 'E:/Procedure/lunWen/EsLint_test/test/ssb/identifies_logs.txt';
    // 创建可读流
    //const readStream = fs.createReadStream(filePath, 'utf8');

    //// 创建逐行读取接口
    //const rl = readline.createInterface({
        //input: readStream,
        //crlfDelay: Infinity
    //});

    //// 创建数组来存储解析后的对象
    const jsonArray = [];
    //// 逐行读取文件
    //rl.on('line', (line) => {
        //try {
            //// 将每一行的JSON字符串解析为JavaScript对象
            //const jsonObject = JSON.parse(line);
            //jsonArray.push(jsonObject);
        //} catch (parseError) {
            //console.error('Error parsing JSON:', parseError);
        //}
    //});

    //// 监听文件读取结束事件
    //rl.on('close', () => {
        //console.log('文件读取结束');
        //let results = [];
        //for (let x = 0; x < jsonArray.length; x++) {
            //if (jsonArray[x].length == 1)
                //continue;
            //for (let y = x + 1; y < jsonArray.length; y++) {
                //if (jsonArray[y].length == 1)
                    //continue;
                //if (jsonArray[x][0].frameID != jsonArray[y][0].frameID)
                    //break;
                //results = filterArr(jsonArray[x], jsonArray[y]);
                //if (results.length != 0)
                    //fs.writeFileSync(outputFilePath, JSON.stringify(results, null, 0) + '\n', { flag: 'a+' });
            //}
        //}
    //});

    // 同步读取文件内容
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // 将文件内容按行拆分
    const lines = fileContent.split('\n');
    for (let line = 0; line < lines.length - 1; line++){
        const jsonObject = JSON.parse(lines[line]);
        jsonArray.push(jsonObject);
    }
    let results = [];
    for (let x = 0; x < jsonArray.length; x++) {
        if (jsonArray[x].length == 1)
            continue;
        for (let y = x + 1; y < jsonArray.length; y++) {
            if (jsonArray[y].length == 1)
                continue;
            if (jsonArray[x][0].frameID != jsonArray[y][0].frameID)
                break;
            results = filterArr(jsonArray[x], jsonArray[y]);
            if (results.length != 0)
                fs.writeFileSync(outputFilePath, JSON.stringify(results, null, 0) + '\n', { flag: 'a+' });
        }
    }
    // 获取结束时间
    const endTime = process.hrtime(startTime);
    // 计算经过的时间（以毫秒为单位）
    const elapsedTime = (endTime[0] * 1000 + endTime[1] / 1e6) / 1000;
    console.log(`冲突分析花费时间: ${elapsedTime} s`);
    fs.writeFileSync(`${path.dirname(outputFilePath)}/time.txt`, `冲突分析花费时间: ${elapsedTime} s\n`, { flag: 'a+' });

}

class Result {
  constructor(conflictName, conflictFrame, conflictScript, conflictType, conflictPosition) {
    this.conflictName = conflictName;
    this.conflictFrame = conflictFrame;
    this.conflictScript = conflictScript;
    this.conflictType = conflictType;
    this.conflictPosition = conflictPosition;
  }
}

// 比较两个文件有没有相同的全局标识符
function filterArr(obj1, obj2){
    let results = [];
    for (let i = 1; i < obj1.length; i++) {
        for (let j = 1; j < obj2.length; j++) {
            if (obj1[i].name == obj2[j].name) {
                let conflictName = obj1[i].name;
                let conflictFrame = obj1[0].frameID;
                let conflictScript = obj1[0].scriptID + ',' + obj2[0].scriptID;
                let conflictType = checkConflictType(obj1[i], obj1[0].scriptID, obj2[j], obj2[0].scriptID);
                let conflictPosition = [{
                    "frameID": obj1[0].frameID,
                    "scriptID": obj1[0].scriptID,
                    "position": obj1[i].position
                }, {
                    "frameID": obj2[0].frameID,
                    "scriptID": obj2[0].scriptID,
                    "position": obj2[j].position

                }];
                results.push(new Result(conflictName, conflictFrame, conflictScript, conflictType,conflictPosition));
                break;
            }
        }
    }
    return results;
}

// 传入两个对象，判断冲突类型
function checkConflictType(obj1, scriptID_obj1, obj2, scriptID_obj2){
   if (obj1.isDefined == true && obj2.isDefined == true) 
       return 'Error Define conflict';
    if (obj1.isWrited == true && obj2.isWrited == true) {
        if (!arraysAreEqual(obj1.type, obj2.type))
            return 'Error Type conflict';
        return 'Warning Value conflict';
   }
   if (obj1.isRead == true && (obj2.isDefined == true || obj2.isWrited == true)) 
       return `Info ${scriptID_obj1} depends on  ${scriptID_obj2}`;
   if (obj2.isRead == true && (obj1.isDefined == true || obj1.isWrited == true)) 
       return `Info ${scriptID_obj2} depends on  ${scriptID_obj1}`;
}

// 判断两个type数组是否相等
function arraysAreEqual(arr1, arr2) {
    console.log('进入数组判断函数');
    if (arr1.length == 0 || arr2.length == 0)
        return true;
    for (let i = 0; i < arr1.length; i++){
        for (let j = 0; j < arr2.length; j++){
            if (arr1[i] == arr2[j])
                return true;
        }
    }
    return false;
}

module.exports = {
    find_conflicts,
};
