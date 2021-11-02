// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const {  window, workspace, commands, ProgressLocation } = vscode;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = commands.registerCommand('music-snippet.musicSnippets', function () {
		// The code you place here will be executed every time your command is executed
		window.withProgress({
			location: ProgressLocation.Notification,
			title: "代码片段同步",
			cancellable: true
		// @ts-ignore
		}, (progress, token) => {
			token.onCancellationRequested(() => {
				console.log("开始同步代码片段");
			})
			progress.report({ increment: 0 });
			const userToken = workspace.getConfiguration('music-snippet').token;
			const url = workspace.getConfiguration('music-snippet').url;
			if (!userToken) {
				window.showErrorMessage('请填写账户token');
				return;
			}
			if (!url) {
				window.showErrorMessage('请填写gitlab的url');
				return;
			}
			// @ts-ignore
			axios.get(`${url}/api/v4/snippets`, {
				headers: {
					'PRIVATE-TOKEN': userToken
				}
			})
			.then(response => {
				console.log('res', response)
				progress.report({ increment: 50, message: `已拉取到代码片段列表,共${response.data.length}个，正在拉取代码片段详情` });
				const all = response.data.map(i => new Promise((resolve, reject) => {
					// @ts-ignore
					axios.get(`${url}/api/v4/snippets/${i.id}/raw`, {
						headers: {
							'PRIVATE-TOKEN': userToken
						}
					}).then(res => resolve(res));
				}));
				Promise.all(all).then((allRes) => {
					const resultData = {};
					allRes.forEach((item, index) => {
						resultData[response.data[index].title] = {
							prefix: response.data[index].title,
							body: item.data.split('\n'),
							description: response.data[index].description,
						};
					})
					progress.report({ increment: 80, message: `代代码片段共拉取${allRes.length}个，正在写入` });
					let file = path.resolve(__dirname, './snippets.json');
					// @ts-ignore
					fs.writeFile(file, JSON.stringify(resultData, null, 4), { encoding: 'utf8' }, err => {})
					progress.report({ increment: 100, message: '已同步所有代码片段' });
					return new Promise(resolve => {
						setTimeout(() => {
							resolve();
						}, 5000);
					});
				})
			})
			.catch(error => {
				return Promise.reject('失败');
			});

			return new Promise((resolve, reject) => {
				setTimeout(() => {
					reject();
				}, 5000);
			});
		});
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}