import { App, Notice, Plugin, PluginSettingTab, Setting, moment, MarkdownView, Platform } from 'obsidian';
import { createDailyNote, getAllDailyNotes, getDailyNote } from 'obsidian-daily-notes-interface';

interface LumberjackSettings {
	logPrefix: string;
	useTimestamp: boolean;
	alwaysOpenInNewLeaf: boolean;
	inboxFilePath: string;
	newDraftFilenameTemplate: string;
}

const DEFAULT_SETTINGS: LumberjackSettings = {
	logPrefix: '- [ ] ',
	useTimestamp: true,
	alwaysOpenInNewLeaf: false,
	inboxFilePath: "/",
	newDraftFilenameTemplate: "YYYYMMDDHHmm"
}

const editModeState = {
	state: { mode: "source" },
	active: true,
	focus: true
};

interface Parameters {
	data?: string;
	vault?: string;
	name?: string;
}

export default class LumberjackPlugin extends Plugin {
	settings: LumberjackSettings;

	async onload() {
		console.log('Loading the Lumberjack plugin. 𖥧');

		await this.loadSettings();

		this.addCommand({
			id: 'lumberjack-log',
			name: 'Log something new on your daily note',
			callback: () => {
				this.newLog(this.settings.alwaysOpenInNewLeaf);
			}
		});

		this.addSettingTab(new LumberjackSettingsTab(this.app, this));

		this.registerObsidianProtocolHandler("log", async (𖣂) => {

			// Need to handle multiple vaults, I guess. Sigh.

			const parameters = 𖣂 as unknown as Parameters;

			for (const parameter in parameters) {
				(parameters as any)[parameter] = decodeURIComponent((parameters as any)[parameter]); // Thanks to @Vinzent03 for a clear-cut (pun intended) example of how to do this
			}

			if (parameters.data) {
				this.ifATreeFallsInTheBackgroundDidItEverReallyFall(parameters.data);
			} else {
				this.newLog(this.settings.alwaysOpenInNewLeaf);
			}
		});

		this.registerObsidianProtocolHandler("timber", async (𖣂) => {

			// Need to handle multiple vaults, I guess. Sigh.

			const parameters = 𖣂 as unknown as Parameters;

			for (const parameter in parameters) {
				(parameters as any)[parameter] = decodeURIComponent((parameters as any)[parameter]); // Thanks to @Vinzent03 for a clear-cut (pun intended) example of how to do this
			}

			if (parameters.name) {
				this.ifATreeFallsInTheBackgroundDidItEverReallyFall(parameters.data);
			} else {
				this.timber();
			}
		});

	}

	// 
	async newLog(openFileInNewLeaf: boolean) {
		let obsidianMobileFlag = Platform.isMobile;

		let dailyNote = getDailyNote(moment(), getAllDailyNotes());
		if (!dailyNote) { dailyNote = await createDailyNote(moment()); }
		let tampTime: string;
		
		if (this.settings.useTimestamp) {
			tampTime = moment().format("HH:mm") + " ";
		} else {
			tampTime = "";
		}

		let openedDailyNote = await this.app.workspace.openLinkText(dailyNote.name, dailyNote.path, openFileInNewLeaf, editModeState);

		let editor = this.app.workspace.getActiveViewOfType(MarkdownView).editor;

		let linePrefix = "\n" + this.settings.logPrefix + tampTime;
		editor.focus();
		if (obsidianMobileFlag) {
			editor.setCursor(editor.lastLine());
			editor.replaceSelection(linePrefix);
			editor.setCursor(editor.lastLine());
		} else {
			const initialLines = editor.lineCount();
			console.log(initialLines);
			editor.setCursor({ line: initialLines, ch: 0 });
			editor.replaceSelection(linePrefix);
			const finalLines = editor.lineCount();
			console.log(finalLines);
			editor.setCursor({ ch: 0, line: finalLines });
		}
	
	}

	// Log the thought in the background.
	async ifATreeFallsInTheBackgroundDidItEverReallyFall(someData: string) {
		let dailyNote = getDailyNote(moment(), getAllDailyNotes());
		if (!dailyNote) { dailyNote = await createDailyNote(moment()); }
		let tampTime: string;
		
		if (this.settings.useTimestamp) {
			tampTime = moment().format("HH:mm") + " ";
		}

		let dailyNoteText = (await this.app.vault.read(dailyNote)) + "\n" + this.settings.logPrefix + tampTime + someData;

		this.app.vault.modify(dailyNote, dailyNoteText) // write the new line in
		new Notice('Data "' + someData + '" logged to the daily note.');
	}

	async timber() {
		let obsidianMobileFlag = Platform.isMobile;

		let zkUUIDNoteName = moment().format(this.settings.newDraftFilenameTemplate);
		await this.app.vault.create(this.settings.inboxFilePath + zkUUIDNoteName + ".md", "");
		let newDraft = await this.app.workspace.openLinkText(zkUUIDNoteName, this.settings.inboxFilePath, this.settings.alwaysOpenInNewLeaf, editModeState);
		let editor = this.app.workspace.getActiveViewOfType(MarkdownView).editor;

		editor.focus();
		let startChar = "";
		if (obsidianMobileFlag) {
			editor.setCursor(editor.lastLine());
			editor.replaceSelection(startChar);
			editor.setCursor(editor.lastLine());
		} else {
			const initialLines = editor.lineCount();
			editor.setCursor({ line: initialLines, ch: 0 });
			editor.replaceSelection(startChar);
			const finalLines = editor.lineCount();
			editor.setCursor({ ch: 0, line: finalLines });
		}

	}

	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class LumberjackSettingsTab extends PluginSettingTab {
	plugin: LumberjackPlugin;

	constructor(app: App, plugin: LumberjackPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Lumberjack Settings'});

		new Setting(containerEl)
			.setName('Prefix for logging')
			.setDesc('Sets a prefix for lines added via the log command')
			.addText(text => text
				.setPlaceholder('Prefix:')
				.setValue(this.plugin.settings.logPrefix)
				.onChange(async (value) => {
					this.plugin.settings.logPrefix = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Timestamp')
			.setDesc('If enabled, the log command will prefix newly added lines with a timestamp.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useTimestamp)
				.onChange(async (value) => {
					this.plugin.settings.useTimestamp = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Always open in a new pane')
			.setDesc('If enabled, Lumberjack commands will always open in a new pane.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.alwaysOpenInNewLeaf)
				.onChange(async (value) => {
					this.plugin.settings.alwaysOpenInNewLeaf = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Inbox folder')
			.setDesc('Set the destination for notes created with `obsidian://timber`.')
			.addText(text => text
				.setValue(this.plugin.settings.inboxFilePath)
				.setPlaceholder(this.plugin.settings.inboxFilePath)
				.onChange(async (value) => {
					this.plugin.settings.inboxFilePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Filename for new drafts')
			.setDesc('Set the filename template for new drafts created with `obsidian://timber`. Uses Moment formatting, same as daily notes. Default: YYYYMMDDHHmm')
			.addText(text => text
				.setValue(this.plugin.settings.newDraftFilenameTemplate)
				.setPlaceholder(this.plugin.settings.newDraftFilenameTemplate)
				.onChange(async (value) => {
					this.plugin.settings.newDraftFilenameTemplate = value;
					await this.plugin.saveSettings();
				}));
	}
}
