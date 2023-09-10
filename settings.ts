import EmbedCodeFile from './main';

import { PluginSettingTab, Setting, App } from 'obsidian';

export interface EmbedCodeFileSettings {
	includedLanguages: string;
	titleBackgroundColor: string;
	titleFontColor: string;
	showLineNumbers: boolean;  
	openConsole:boolean;
	openExplorer:boolean;
	openObsidian:boolean;
	openDefaultApp: boolean;
	openTotalCmd: boolean;
}


export const DEFAULT_SETTINGS: EmbedCodeFileSettings = {
	includedLanguages: 'c,cs,cpp,java,python,go,ruby,javascript,js,typescript,ts,shell,sh,bash',
	titleBackgroundColor: "#00000020",
	titleFontColor: "",
	showLineNumbers: true,  // Default value
	openConsole: false,  // Default value
	openExplorer: false,
	openObsidian: false,
	openDefaultApp: false,
	openTotalCmd: false
	
}


export class EmbedCodeFileSettingTab extends PluginSettingTab {
	plugin: EmbedCodeFile;

	constructor(app: App, plugin: EmbedCodeFile) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl('h2', {text: 'Embed Code File Settings'});

		new Setting(containerEl)
			.setName('Included Languages')
			.setDesc('Comma separated list of included languages.')
			.addText(text => text
				.setPlaceholder('Comma separated list')
				.setValue(this.plugin.settings.includedLanguages)
				.onChange(async (value) => {
					this.plugin.settings.includedLanguages = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Font color of title")
			.addText(text => text
				.setPlaceholder('Enter a color')
				.setValue(this.plugin.settings.titleFontColor)
				.onChange(async (value) => {
					this.plugin.settings.titleFontColor = value;
					await this.plugin.saveSettings();
				}));
		  
		new Setting(containerEl)
			.setName('Background color of title')
			.addText(text => text
				.setPlaceholder('#00000020')
				.setValue(this.plugin.settings.titleBackgroundColor)
				.onChange(async (value) => {
					this.plugin.settings.titleBackgroundColor = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Show Line Numbers')
			.setDesc('Check this to show line numbers in the code embed.')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.showLineNumbers)
					.onChange(async (value) => {
						this.plugin.settings.showLineNumbers = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName('Open console')
			.setDesc('Open console when clicking on the title.')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.openConsole)
					.onChange(async (value) => {
						this.plugin.settings.openConsole = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName('Open explorer')
			.setDesc('Open explorer with the file selected.')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.openExplorer)
					.onChange(async (value) => {
						this.plugin.settings.openExplorer = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName('Open in Obsidian')
			.setDesc('open the file through obsidian. If a supporting plugin is installed (e.g. Plain Text), it will open it in Obsidian')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.openObsidian)
					.onChange(async (value) => {
						this.plugin.settings.openObsidian = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName('Open in the default app')
			.setDesc('Open the file with the default app.')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.openDefaultApp)
					.onChange(async (value) => {
						this.plugin.settings.openDefaultApp = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(containerEl)
			.setName('Open in total commander')
			.setDesc('Open the file with total commander.')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.openTotalCmd)
					.onChange(async (value) => {
						this.plugin.settings.openTotalCmd = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
