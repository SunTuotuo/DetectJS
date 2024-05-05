const fs = require('fs');
const babel = require('@babel/core');
const t = require('@babel/types'); // 引入 Babel types 工具
const { PassThrough } = require('stream');


//const code = fs.readFileSync('E:\\Procedure\\lunWen\\EsLint_test\\test\\1.js', 'utf-8');
//const code = fs.readFileSync('E:\\Procedure\\lunWen\\EsLint_test\\test\\ssb.html', 'utf-8');
//const code = fs.readFileSync('E:\\Procedure\\lunWen\\libraries\\3Dmol\\2.0.5\\3Dmol.js', 'utf-8');
//const code = fs.readFileSync('E:\\Procedure\\lunWen\\libraries\\ocanvas\\2.10.1\\ocanvas.js', 'utf-8');
//const code = fs.readFileSync('E:\\Procedure\\lunWen\\libraries\\aframe\\1.4.2\\aframe.min.js', 'utf-8');

function find_golbal_identifies (filename){
    const code = fs.readFileSync(filename, 'utf-8');
    const ast = babel.parse(code, {
        sourceType: "script"
    });

    const names = {
        variables: [],
        functions: [],
        objects: [],
    };

    babel.traverse(ast, {
        VariableDeclarator(path) {
            // 获取函数体的父节点路径
            const parentPath = path.parentPath.parentPath;

            // 检查是否是顶级作用域
            if (t.isProgram(parentPath.node)) {
                // 筛选通过函数表达式定义的函数
                if (path.node.init != null && (path.node.init.type == "FunctionExpression" || path.node.init.type == "ArrowFunctionExpression") && !names.functions.includes(path.node.id.name))
                    names.functions.push(path.node.id.name);
                // 筛选被赋值函数的变量
                else if (path.node.init != null && path.node.init.type == "Identifier" && names.functions.includes(path.node.init.name))
                    names.functions.push(path.node.id.name);

                else if (!names.variables.includes(path.node.id.name))
                    names.variables.push(path.node.id.name);
            }
        },
        FunctionDeclaration(path) {
            // 获取函数体的父节点路径
            const parentPath = path.parentPath;

            // 检查是否是顶级作用域
            if (t.isProgram(parentPath.node) && !names.functions.includes(path.node.id.name)) {
                // 通过函数声明定义的函数
                names.functions.push(path.node.id.name);
            }
        },
        AssignmentExpression(path) {
            try {
                var node = path.node.left;
                var obj = node.object;
                if (typeof (obj.name) != 'undefined' && obj.name == 'window') {
                    if ((path.node.right.type == "FunctionExpression" || path.node.right.type == "ArrowFunctionExpression") && !names.variables.includes(node.property.name))
                        names.functions.push('window.' + node.property.name);
                    else if (path.node.right.type == "Identifier" && names.functions.includes(path.node.right.name))
                        names.functions.push('window.' + node.property.name);
                    else if (!names.variables.includes(node.property.name))
                        names.variables.push('window.' + node.property.name);

                }
            } catch (error) {
                PassThrough;
            }
        },
        //FunctionDeclaration(path){
        //path.traverse({
        //Identifier(path) {
        //const node = path.node;
        //const binding = path.scope.getBinding(node.name);
        //if (binding && binding.scope.block.type == 'Program' && !names.functions.includes(node.name)) {
        //names.functions.push(node.name);
        //}
        //}
        //});
        //},
        //VariableDeclaration(path){
        //path.traverse({
        //Identifier(path) {
        //const node = path.node;
        //const binding = path.scope.getBinding(node.name);
        //if (binding && binding.scope.block.type == 'Program' && !names.variables.includes(node.name)) {
        //names.variables.push(node.name);
        //}
        //}
        //});
        //}
    });

    //console.log('Variables:', names.variables);
    //console.log('Functions:', names.functions);
    //console.log('Objects:', names.objects);
    return names;

}

module.exports = {
    find_golbal_identifies,
};