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
	inboxFilePath: "Inbox",
	newDraftFilenameTemplate: "YYYYMMDDHHmmss",
	targetHeader: "Journal"
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
		console.debug('Loading the Lumberjack plugin. 𖥧');

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

			for (const parameter in parameters) { // not yet using parameters
				(parameters as any)[parameter] = decodeURIComponent((parameters as any)[parameter]); // Thanks to @Vinzent03 for a clear-cut (pun intended) example of how to do this
			}

			this.newLog(this.settings.alwaysOpenInNewLeaf);
		});

		this.registerObsidianProtocolHandler("timber", async (𖣂) => {

			// Need to handle multiple vaults, I guess. Sigh.

			const parameters = 𖣂 as unknown as Parameters;

			for (const parameter in parameters) {
				(parameters as any)[parameter] = decodeURIComponent((parameters as any)[parameter]); // Thanks to @Vinzent03 for a clear-cut (pun intended) example of how to do this
			}

			if (parameters.name) {
				// this.ifATreeFallsInTheBackgroundDidItEverReallyFall(parameters.name); // not yet implemented
			} else {
				this.timber();
			}
		});

	}

	// newLog creates a new item with a user-configured prefix under a user-configured heading in the daily note, and gives them editing ability in that position immediately.
	async newLog(openFileInNewLeaf: boolean) {

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
		if (editor == null) {
			new Notice(`Could not find the daily note. Check your daily note settings, or report this as a bug on the plugin repository.`);
			return
		}

		// establish the line prefix to add, if anything
		let linePrefix = `
${this.settings.logPrefix}${tampTime}`

		// Make sure the editor has focus
		editor.focus();

		// Inserting the cursor
		// The goal is to set the cursor either at the end of the user's target section, if set, or at the end of the note
		
		// find the section to insert the log item into and set the insert position to append into it, or set the insert position to the end of the note
		let sections = this.app.metadataCache.getFileCache(dailyNote).headings;
		if (this.settings.targetHeader != "") { // If the user has set a target header
			// need to figure out which line the _next_ section is on, if any, then use that line number in the functions below
			let targetSection = sections.find( (eachSection) => (eachSection.heading === this.settings.targetHeader)); // does the heading we're looking for exist?
			if (typeof(targetSection !== undefined)) { // The target section exists
				let nextSection = sections.find( (eachSection) => ((eachSection.position.start.line > targetSection.position.start.line) && (eachSection.level <= targetSection.level))); // matches sections _after_ our target, with the same level or greater
				console.debug(nextSection);
				if (!nextSection) {
					// There is no section following the target section. Look for the end of the document
					// A better approach would append the item at the end of the content inside the user's target section, because it's possible that someone would put more stuff in their daily note without a following section, but that will have to be implemented later.
					console.debug("No section follows the target section. Inserting the log item at the end of the target section.")
					editor.setCursor(editor.lastLine());
					editor.replaceSelection(linePrefix);
					editor.setCursor(editor.lastLine());
				} else {
					if (typeof(nextSection) !== undefined) { // The search for a following section did not return undefined, therefore it exists
						// Find out if there is a preceding blank line before the next section. E.g., does the user use linebreaks to separate content in edit mode? If so, inserting the next item after that line break will look messy.
						
						if (editor.getLine(nextSection.position.start.line - 1).length > 0) {
							// The line just before the next section header is not blank. Insert the log item just before the next section, without a line break.
							console.debug(`The line before the next section header is ${editor.getLine(nextSection.position.start.line - 1).toString()}`);
							console.debug("No blank lines found between the target section and the next section.");
								editor.setCursor(nextSection.position.start.line - 1);
								editor.replaceSelection(linePrefix);
								editor.setCursor(nextSection.position.start.line);
						} else {
							console.debug(`The line before the next section has 0 length. It is: ${editor.getLine(nextSection.position.start.line - 1)}`)
							// The line just before the next section header is blank. It's likely that the user uses line breaks to clean up their note in edit mode. 
							// The approach here is to iterate over the lines preceding the next section header until a non-blank line is reached, then insert the log item at (iterator.position.start.line + 1)...
							let lastBlankLineFound = false;
							let noBlankLines = false;
							let lastLineBeforeLineBreakIteratorLineNumber = nextSection.position.start.line - 2; // `lastLineBeforeLineBreakIteratorNumber: this wordy variable represents the number of the last-line-before-line-break iterator's current line
							while (lastBlankLineFound == false) {
								let blankLineFinderCurrentLine = editor.getLine(lastLineBeforeLineBreakIteratorLineNumber);
								if (editor.getLine(0) === blankLineFinderCurrentLine) { // This condition would mean the iterator found the start of the document
									noBlankLines = true;
									lastBlankLineFound = false;
								} else {
									if (blankLineFinderCurrentLine.length > 0) {
										lastBlankLineFound = true;
									} else {
										lastLineBeforeLineBreakIteratorLineNumber = lastLineBeforeLineBreakIteratorLineNumber - 1; // Move to the next line up
									}
								}
							}

							if (noBlankLines) { // this means the iterator failed to find any blanks at all; insert the log item just before the next section.
								console.debug("No blank lines found.");
								editor.setCursor(nextSection.position.start.line - 1);
								editor.replaceSelection(linePrefix);
								editor.setCursor(nextSection.position.start.line - 1);
							} else { // There were an arbitrary number of blank lines before the next section header. Insert the log item _after_ the last (length > 0) line before the next section header.
								console.debug(`Iterator stopped at line ${lastLineBeforeLineBreakIteratorLineNumber}, with text ${editor.getLine(lastLineBeforeLineBreakIteratorLineNumber)}`);
								editor.setCursor(lastLineBeforeLineBreakIteratorLineNumber);
								editor.replaceSelection(linePrefix);
								editor.setCursor(lastLineBeforeLineBreakIteratorLineNumber + 1);
							}

							
						}
					}
				}
			}
		} else {
			// The user has not set a target header. Insert the log item at the bottom of the note.
			editor.setCursor(editor.lastLine());
			editor.replaceSelection(linePrefix);
			editor.setCursor(editor.lastLine());
		}

	
	}

// 	// Log the thought in the background.
//	// Not yet implemented.
// 	async ifATreeFallsInTheBackgroundDidItEverReallyFall(someData: string) {
// 		let dailyNote = getDailyNote(moment(), getAllDailyNotes());
// 		if (!dailyNote) { dailyNote = await createDailyNote(moment()); }
// 		let tampTime: string;
		
// 		if (this.settings.useTimestamp) {
// 			tampTime = moment().format("HH:mm") + " ";
// 		}

// 		let dailyNoteOldText = await this.app.vault.read(dailyNote); // unsure about using .read versus .cachedRead here. as this is meant to be used when Obsidian is in the background

// 		let dailyNoteNewText = `${dailyNoteOldText}
// ${this.settings.logPrefix}${tampTime}${someData}`

// 		this.app.vault.modify(dailyNote, dailyNoteNewText) // write the new line in
// 		new Notice('Data "' + someData + '" logged to the daily note.');
// 	}

	async timber() {

		let zkUUIDNoteName = moment().format(this.settings.newDraftFilenameTemplate);

		console.log(`${this.settings.inboxFilePath}`);

		if (!(this.app.vault.getAbstractFileByPath(`${this.settings.inboxFilePath}`))) { // In the future, handle folder creation as necessary. For now, error and tell the user if the inbox folder does not exist.
			new Notice(`Error. Lumberjack couldn't create the draft. Does the inbox folder you've set in Preferences -> Lumberjack 🪓🪵 exist?`);
			return;
		}
		
		await this.app.vault.create(`/${this.settings.inboxFilePath}/${zkUUIDNoteName}.md`, "");

		let newDraft = await this.app.workspace.openLinkText(zkUUIDNoteName, `/${this.settings.inboxFilePath}/`, this.settings.alwaysOpenInNewLeaf, editModeState);

		let editor = this.app.workspace.getActiveViewOfType(MarkdownView).editor;

		if (editor == null) {
			new Notice(`Could not find the daily note. Check your daily note settings, or report this as a bug on the plugin repository.`);
			return
		}

		editor.focus();
		let startChar = "";
		editor.setCursor(editor.lastLine());
		editor.replaceSelection(startChar);
		editor.setCursor(editor.lastLine());

	}

	onunload() {
		console.debug('Unloading the Lumberjack plugin. Watch out for splinters.');
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
			.setDesc('Set the destination for notes created with `obsidian://timber`, e.g., `My Notes/Inbox`. Do not include leading or trailing slashes.')
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
