import { App, Notice, Plugin, PluginSettingTab, Setting, moment, MarkdownView, Platform } from 'obsidian';
import { createDailyNote, getAllDailyNotes, getDailyNote } from 'obsidian-daily-notes-interface';

interface LumberjackSettings {
	logPrefix: string;
	useTimestamp: boolean;
	alwaysOpenInNewLeaf: boolean;
	inboxFilePath: string;
	newDraftFilenameTemplate: string;
	targetHeader: string;
}

const DEFAULT_SETTINGS: LumberjackSettings = {
	logPrefix: '- [ ] ',
	useTimestamp: true,
	alwaysOpenInNewLeaf: false,
	inboxFilePath: "/",
	newDraftFilenameTemplate: "YYYYMMDDHHmm",
	targetHeader: "## Journal"
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
		
		// check if the app is mobile, to change how the editor is manipulated (CM5 vs CM6 have slightly different functions)
		// note: might need to re-evaluate this once the desktop CM6 editor is launched
		let obsidianMobileFlag = Platform.isMobile;

		// find or create the daily note
		let dailyNote = getDailyNote(moment(), getAllDailyNotes());
		if (!dailyNote) { dailyNote = await createDailyNote(moment()); }
		
		// set up the timestamp string, if the user is using it
		let tampTime: string;
		if (this.settings.useTimestamp) {
			tampTime = moment().format("HH:mm") + " ";
		} else {
			tampTime = "";
		}

		// open the daily note in edit mode and get the editor
		let openedDailyNote = await this.app.workspace.openLinkText(dailyNote.name, dailyNote.path, openFileInNewLeaf, editModeState);
		let editor = this.app.workspace.getActiveViewOfType(MarkdownView).editor;

		// establish the line prefix to add, if anything
		let linePrefix = `
${this.settings.logPrefix}${tampTime}`

		// Assume the cursor will be placed at the end of the note
		let sectionFound = false;

		// find the section to insert the log item into and set the insert position to append into it, or set the insert position to the end of the note
		let dailyNoteText = this.app.vault.read(dailyNote);
		if ((await dailyNoteText).contains(this.settings.targetHeader)) {
			// need to figure out which line the _next_ section is on, if any, then use that line number in the functions below
			
		}

		// Make sure the editor has focus and set the cursor either in the found section or at the end of the note
		editor.focus();
		if (obsidianMobileFlag) {
			if (!sectionFound)
			editor.setCursor(editor.lastLine());
			editor.replaceSelection(linePrefix);
			editor.setCursor(editor.lastLine());
		} else {
			const initialLines = editor.lineCount();
			editor.setCursor({ line: initialLines, ch: 0 });
			editor.replaceSelection(linePrefix);
			const finalLines = editor.lineCount();
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

		let dailyNoteOldText = await this.app.vault.read(dailyNote); // unsure about using .read versus .cachedRead here. as this is meant to be used when Obsidian is in the background

		let dailyNoteNewText = `${dailyNoteOldText}
${this.settings.logPrefix}${tampTime}${someData}`

		this.app.vault.modify(dailyNote, dailyNoteNewText) // write the new line in
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
		console.log('Unloading the Lumberjack plugin. Watch out for splinters.');
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
			.setName('Target header')
			.setDesc('Append logged items to a target header in your daily note')
			.addText(text => text
				.setPlaceholder(this.plugin.settings.targetHeader)
				.setValue(this.plugin.settings.targetHeader)
				.onChange(async (value) => {
					this.plugin.settings.targetHeader = value;
					await this.plugin.saveSettings();
				}));

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
