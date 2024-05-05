const babel = require('@babel/core');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');
const process = require('process');
const lodash = require('lodash');
const { PassThrough } = require('stream');
const ph = require('path');


let names = [];
const externalNames = [];
class Item {
  constructor(name, isDefined, isRead, isWrited, position, scope = -1, type = []) {
    this.name = name;
    this.isDefined = isDefined;
    this.isRead = isRead;
    this.isWrited = isWrited;
    this.position = position;
    this.scope = scope;
    this.type = type;
  }
}


function typeInferFast(JSFilename, frameID, scriptID){

  // 获取当前时间
  const startTime = process.hrtime();

  names = [{
    frameID: frameID,
    scriptID: scriptID
  }];
  const code = fs.readFileSync(JSFilename, 'utf-8');
  const ast = parser.parse(code, { sourceType: 'module' });
  let rootPath;
  try{
    traverse(ast, {
      Program(path) {
        // 这里获取根节点的 path
        rootPath = path;
        for (let i in path.scope.bindings) {
          let item = new Item(i, true, undefined, undefined, path.scope.bindings[i].path.node.loc, 0);
          names.push(item);
        }
      },
      AssignmentExpression(path) {
        // 碰到对象属性的，得到对象属性的全称，并判断是不是全局标识符。
        let property;
        if (path.node.left.type == 'MemberExpression') {
          property = getObjectNameByMemberExpression(path.node.left);
          if (property.split('.')[0] == 'window' || getIndexByName(property.split('.')[0], names) != -1) {
            let item = new Item(property, true, undefined, true, path.node.left.loc, 0);
            let index = getIndexByItem(item, names);
            if (index == -1)
              names.push(item);
            else
              names[index].isWrited = true;
          }
        }
        if (path.node.right.type == 'MemberExpression') {
          property = getObjectNameByMemberExpression(path.node.right);
          if (property.split('.')[0] == 'window' || getIndexByName(property.split('.')[0], names) != -1) {
            let item = new Item(property, true, true, undefined, path.node.right.loc, 0);
            let index = getIndexByItem(item, names);
            if (index == -1)
              names.push(item);
            else
              names[index].isRead = true;
          }
        }
      },
      Identifier(path) {
        if (path.parentPath.type != 'MemberExpression') {
          let index = getIndexByName(path.node.name, names);
          if (index != -1) {
            let resultType = typeInfer(path);
            if (resultType != 'unknown' && !names[index].type.includes(resultType))
              names[index].type.push(resultType);
          }
        }
        //if (path.parentPath.type == 'MemberExpression') {
          //// 如果该标识符是对象成员，则往上查找，找出该标识符的全名
          //let path2 = lodash.cloneDeep(path);
          //while(path2.parentPath.type == 'MemberExpression') {
            //path2 = path2.parentPath;
          //}
          //let property = getObjectNameByMemberExpression(path2.node);
          //// 若标识符是全局标识符，进行类型推断
          //let index = getIndexByName(property, names);
          //if (index != -1) {
            //let resultType = typeInfer(path);
            //if (resultType != 'unknown' && !names[index].type.includes(resultType))
              //names[index].type.push(resultType);
          //}
        //}
      },
    });
  }catch(err){
    console.log(err.message);
  }

  const outputFilePath = ph.dirname(JSFilename) + '/../identifies_logs.txt';
  fs.writeFileSync(outputFilePath, JSON.stringify(names, null, 0) + '\n', { flag: 'a+' });
  //console.log(`标识符日志写入到：${ph.dirname(JSFilename)}/../identifies_logs.txt`);

  // 获取结束时间
  const endTime = process.hrtime(startTime);
  // 计算经过的时间（以毫秒为单位）
  const elapsedTime = (endTime[0] * 1000 + endTime[1] / 1e6) / 1000;
  //console.log(`花费时间: ${elapsedTime} s`);

  return names;
}



//判断一个作用域里是否包含某个变量
function IsScopeInculdesVar(targetVariable, path) {
  for (let i in path.scope.bindings) {
    if (i == targetVariable)
      return true;
  }
  // 如果一个变量在顶级作用域，并且没有在顶级作用域中声明，则认为该变量可能是定义在其他文件中。将该变量加入externalNames数组。
  if (path.scope.uid == 0) {
    let item = new Item(targetVariable, undefined, undefined, undefined, undefined, 0);
    if (getIndexByItem(item, externalNames) == -1)
      externalNames.push(item);
    return true;
  }
  return false;
}

//判断一个item对象是否存在于一个数组
function getIndexByItem(item, arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].name === item.name && arr[i].scope === item.scope)
      return i;
  }
  return -1;
}

// 通过变量名判断，一个item在names中的索引
function getIndexByName(name, names) {
  for (let i = 0; i < names.length; i++) {
    if (name == names[i].name)
      return i;
  }
  return -1;
}

// 通过变量名和变量作用域，在names中找到该变量。
function getItem(name, scope, arr) {
  for (let i = 0; i < names.length; i++) {
    if (arr[i].name === name && arr[i].scope === scope)
      return arr[i];
  }
  return null;
}

// 通过字面量类型，确定变量类型。
function getTypeByLiteralType(nodeType) {
  switch (nodeType) {
    case 'NumericLiteral':
      return 'number';
    case 'StringLiteral':
      return 'string';
    case 'BooleanLiteral':
      return 'bool';
    case 'ArrayExpression':
      return 'array';
    case 'ObjectExpression':
      return 'object';
    case 'NewExpression':
      return 'object';
  }
  return 'unknown';
}

// 给一个二元表达式，返回这个二元表达式的类型
function getTypeByBinaryExpression(node, newPath) {
  let operator = ['+', '-', '*', '/', '%'];
  if (operator.includes(node.operator)) {
    // 判断操作符左边变量的类型
    let leftType, rightType;
    if (node.left.type == 'StringLiteral')
      leftType = 'string';
    if (node.left.type == 'NumericLiteral')
      leftType = 'number';
    if (node.left.type == 'BinaryExpression')
      leftType = getTypeByBinaryExpression(node.left, newPath);
    if (node.left.type == 'Identifier') {
      // 在names中找到操作符左边的变量。
      let varName = node.left.name;
      let newPath2 = lodash.cloneDeep(newPath);
      while (!IsScopeInculdesVar(varName, newPath2)) {
        newPath2 = newPath2.parentPath;
      }
      let leftItem = getItem(varName, newPath2.scope.uid, names);
      if (leftItem.type.includes('string'))
        leftType = 'string';
      else if (leftItem.type.includes('number'))
        leftType = 'number';
    }

    // 判断操作符右边变量的类型
    if (node.right.type == 'StringLiteral')
      rightType = 'string';
    if (node.right.type == 'NumericLiteral')
      rightType = 'number';
    if (node.right.type == 'Identifier') {
      // 在names中找到操作符右边的变量。
      let varName = node.right.name;
      let newPath2 = lodash.cloneDeep(newPath);
      while (!IsScopeInculdesVar(varName, newPath2)) {
        newPath2 = newPath2.parentPath;
      }
      let rightItem = getItem(varName, newPath2.scope.uid, names);
      if (rightItem.type.includes('string'))
        rightType = 'string';
      else if (rightItem.type.includes('number'))
        rightType = 'number';
    }

    // 根据b，c的类型对a的类型进行推断
    if ((node.operator == '+') && (leftType == 'string' || rightType == 'string'))
      return 'string';
    if (leftType == 'number' && rightType == 'number')
      return 'number';
  }
  return 'unknown';
}

// 给一个标识符，返回这个标识符的类型数组
function getTypeByIdentifier(node, path) {
  let newPath = lodash.cloneDeep(path);
  const VariableName = node.name;
  // 先找到该变量的作用域
  while (!IsScopeInculdesVar(VariableName, newPath)) {
    newPath = newPath.parentPath;
  }
  let scopeId = newPath.scope.uid;
  let item = new Item(VariableName, undefined, undefined, undefined, undefined, scopeId);
  // 判断一个标识符是不是已经在names数组中了
  let index = getIndexByItem(item, names);
  if (index === -1) {
    return [];
  } else {
    return names[index].type;
  }
}

// 类型推断函数
function typeInfer(path) {
  let newPath = lodash.cloneDeep(path);
  // 1. 字面量赋值：a = 123/'123'/true/[1,2,3]/{1,2,3}，a的类型直接由字面量类型确定
  if (newPath.parentPath.isVariableDeclarator() && newPath.parentPath.node.init != undefined && newPath.parentPath.node.init.type != 'BinaryExpression')
    return getTypeByLiteralType(newPath.parentPath.node.init.type);
  // 9. 给变量赋值为函数返回值，则判断函数的返回值是什么类型
  if (newPath.parentPath.isVariableDeclarator() && newPath.parentPath.node.init != undefined && newPath.parentPath.node.init.type == 'CallExpression' && newPath.parentPath.node.init.callee.name != undefined)
    return getTypeByFunction(newPath.parentPath.node.init.callee.name);
  // 2. typeof(a) == t，使用typeof判断表达式类型是否为t，则推断表达式类型为t
  if (newPath.parentPath.node.operator == 'typeof' && newPath.parentPath.parentPath.node.operator == '==') {
    switch (newPath.parentPath.parentPath.node.right.value) {
      case 'number':
        return 'number';
      case 'string':
        return 'string';
      case 'boolean':
        return 'bool';
      case 'object':
        return 'object';
    }
  }
  // 3. a++/a--自增自减运算，则a为number类型
  if (newPath.parentPath.node.operator == '++' || newPath.parentPath.node.operator == '--')
    return 'number';
  // 4. function a (){}函数定义，则a为function类型
  if (newPath.parentPath.node.type == 'FunctionDeclaration' || newPath.parentPath.node.type == 'FunctionExpression' || newPath.parentPath.node.type == 'ArrowFunctionExpression')
    return 'function';
  // 5. a = b +-*/% c若b，c都是number，则a为number。若b，c中有一个类型是string，则b+c为string，b-*/%c结果仍为number
  if (newPath.parentPath.node.type == 'AssignmentExpression') {
    if (newPath.parentPath.node.operator == '=') {
      if (newPath.parentPath.node.right.type == 'BinaryExpression')
        return getTypeByBinaryExpression(newPath.parentPath.node.right, newPath);
      // 7. a = b则a的类型与b的类型相同
      if (newPath.parentPath.node.right.type == 'Identifier') {
        let type = getTypeByIdentifier(newPath.parentPath.node.right, newPath);
        if (type.length != 0)
          return type[type.length - 1];
        else
          return 'unknown';
      }
      let LiteralType = ['NumericLiteral', 'StringLiteral', 'BooleanLiteral', 'ArrayExpression', 'ObjectExpression'];
      if (LiteralType.includes(newPath.parentPath.node.right.type))
        return getTypeByLiteralType(newPath.parentPath.node.right.type);
    }
    // 6.a +=-=*=/= b  若a，b都是number，则运算后a为number。若a，b中有一个为string，则+=运算后a为string，-=*=/=运算之后a为number 
    let operatorType = ['+=', '-=', '*=', '/='];
    if (operatorType.includes(newPath.parentPath.node.operator)) {
      if (newPath.node.name == newPath.parentPath.node.left.name) {
        // 得到a,b的类型
        let leftType, rightType;
        let type = getTypeByIdentifier(newPath.parentPath.node.left, newPath);
        if (type.length != 0)
          leftType = type[type.length - 1];
        else
          leftType = 'unknown';
        let LiteralType = ['NumericLiteral', 'StringLiteral', 'BooleanLiteral', 'ArrayExpression', 'ObjectExpression'];
        if (LiteralType.includes(newPath.parentPath.node.left.type))
          leftType = getTypeByLiteralType(newPath.parentPath.node.left.type);
        if (newPath.parentPath.node.right.type == 'Identifier') {
          let type = getTypeByIdentifier(newPath.parentPath.node.right, newPath);
          if (type.length != 0)
            rightType = type[type.length - 1];
          else
            rightType = 'unknown';
        }
        if (LiteralType.includes(newPath.parentPath.node.right.type))
          rightType = getTypeByLiteralType(newPath.parentPath.node.right.type);
        //通过b的类型，推断a的类型
        if (leftType == 'number' && rightType == 'number')
          return 'number';
        if (leftType == 'string' || rightType == 'string')
          return 'string';
      }


    }
  }
  if (newPath.parentPath.node.init != undefined && newPath.parentPath.node.init.type == 'BinaryExpression')
    return getTypeByBinaryExpression(newPath.parentPath.node.init, newPath);
  // 8. a == b若有判断a，b是否相等语句，则推断a，b类型相同
  if (newPath.parentPath.node.operator == '==') {
    console.log('进入方法');
    let leftType, rightType;
    leftType = getTypeByIdentifier(newPath.parentPath.node.left, newPath);
    rightType = getTypeByIdentifier(newPath.parentPath.node.right, newPath);
    if (leftType.length != 0)
      return leftType[leftType.length - 1];
    else if (rightType.length != 0)
      return rightType[rightType.length - 1];
    else
      return 'unknown';
  }

  return 'unknown';
}

// 给一个成员表达式，返回成员属性window.name
function getObjectNameByMemberExpression(node) {
  let obj = '';
  if (node.object.type == 'MemberExpression')
    obj = getObjectNameByMemberExpression(node.object) + '.' + node.property.name;
  if (node.object.type == 'Identifier')
    obj = node.object.name + '.' + node.property.name;
  return obj;
}

let function_type = {
  "number": ['Number', 'parseInt', 'parseFloat','indexOf', 'lastIndexOf', 'search', 'length', 'localeCompare', 'toExponential', 'toPrecision'],
  "string": ['toLowerCase','toString','toExponential', 'toFixed', 'toPrecision', 'slice', 'substring', 'substr', 'replace', 'toUpperCase', 'concat', 'trim', 'charAt', 'toLocaleLowerCase', 'toLocaleUpperCase', 'trimEnd', 'trimStart'],
  "object": ['split', 'match'],
  "bool": ['includes', 'startsWith', 'endsWith', 'isFinite', 'isInteger', 'isNaN', 'isSafeInteger'],
};

// 给一个函数名，返回该函数的返回值类型
function getTypeByFunction(function_name) {
  for (let key in function_type) {
    if (Object.prototype.hasOwnProperty.call(function_type, key)) {
      const values = function_type[key];
      if (values.includes(function_name)) {
        return key;
      }
    }
  }
  return 'unknown';
}


module.exports = {
    typeInferFast,
};
