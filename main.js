const fs = require('fs');
const path = require('path');
const vm = require('vm');
const args = process.argv.slice(2);

function preprocessNodeFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace 'requirement' with 'require'
    content = content.replace(/\brequirement\b/g, 'require');

    // Replace 'local' with 'let'
    content = content.replace(/\blocal\b/g, 'let');

    // Replace 'begin newmodule' with initialization and function definitions
    content = content.replace(/begin newmodule/g, 'const newmodule = {};');

    // Replace 'function newmodule.newFunction()' with the correct function definition
    content = content.replace(/function newmodule\.newFunction\(\)\s*{/g, 'newmodule.newFunction = function() {');

    // Replace 'return newmodule' with module.exports
    content = content.replace(/\breturn newmodule\b/g, 'module.exports = newmodule;');

    // Replace 'wait' with 'setTimeout'
    content = content.replace(/wait\((\d+),\s*"([^"]+)"\);/g, 'setTimeout(() => onWaitTag("$2"), $1);');

    // Replace 'if {tag: "tag"} =>' with an if statement in JavaScript
    content = content.replace(/if\s*\{\s*tag:\s*"([^"]+)"\}\s*=>/g, 'if (tag === "$1") {');

    // Ensure there are no unclosed conditional structures
    let openBraces = (content.match(/{/g) || []).length;
    let closeBraces = (content.match(/}/g) || []).length;

    if (openBraces > closeBraces) {
        content += '}\n'.repeat(openBraces - closeBraces);
    }

    // Add a new line at the end of the file for correct interpretation
    content += '\n';

    return content;
}

if (args.length > 1) {
    const command = args[0];
    const filePath = args[1];

    if (command === '--run') {
        // Ensure the file exists before attempting to execute
        if (fs.existsSync(filePath)) {
            const code = preprocessNodeFile(filePath);
            try {
                // Use vm.Script for execution with appropriate context
                const script = new vm.Script(code);
                const context = vm.createContext({
                    require,
                    module,
                    exports: {},
                    console,
                    setTimeout,
                    clearTimeout,
                    setInterval,
                    clearInterval
                });
                script.runInContext(context);
                console.log('File executed successfully.');
            } catch (err) {
                console.error('Error executing the file:', err);
            }
        } else {
            console.error('File does not exist:', filePath);
        }
    } else if (command === '--create') {
        if (!filePath) {
            console.error('No file path provided for creation.');
            process.exit(1);
        }

        // Create a .node file with sample content
        const defaultContent = `
// Sample .node file
local stringVariable = "abc";
local numberVariable = 1
local myTable = {
    property1: "value1",
    property2: 42,
    nestedTable: {
        nestedProperty: "nestedValue"
    }
};

wait(1000, "tag");

function onWaitTag(tag) {
    if (tag === "tag") {
        console.log("execution onwaittag is success");
    }
}

local axios = requirement("axios");

begin newmodule

function newmodule.newFunction() {
    console.log("Module function called");
}

return newmodule; // It uses: module.exports = newmodule
`;

        fs.writeFile(filePath, defaultContent.trim(), (err) => {
            if (err) throw err;
            console.log('File created successfully:', filePath);
        });
    } else {
        console.error('Unknown command:', command);
    }
} else {
    console.error('Invalid arguments. Usage: node main.js --create <file-path>');
}
