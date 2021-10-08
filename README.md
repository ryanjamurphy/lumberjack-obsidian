## Lumberjack 🪓 🪵

Lumberjack helps you quickly jump from anywhere to logging something new in Obsidian. Its log command can be used from within the app to create a new line with a preset prefix at the end of your daily note and make sure you're in edit mode, so you can swiftly lodge whatever's on your mind away, and then get back to whatever you were doing.

The real power, though, is in its URL schemes. The clear-cut commands `obsidian://log` and `obsidian://timber` let you jump straight into edit mode on your daily note or a brand-new draft, respectively, with the cursor sharpened and ready to go in just the right place.

### Demo videos:

#### Log

<video height="800" controls>
  <source src="https://user-images.githubusercontent.com/3618647/136626863-e4bb5fd0-e6d8-4341-aee4-d2a6359cc912.MP4" type="video/mp4">
</video>

![A demo of the Lumberjack Log URL scheme on iOS via Shortcuts](https://user-images.githubusercontent.com/3618647/136626863-e4bb5fd0-e6d8-4341-aee4-d2a6359cc912.MP4)

#### Timber

![A demo of the Lumberjack Timber URL scheme on iOS via Shortcuts](https://user-images.githubusercontent.com/3618647/136626936-cafb5e96-0363-47b2-8509-b7b18cdbe158.MP4)


### How to use

- Install the plugin via the in-app Community Plugins gallery (preferred) or manually, as instructed below.

#### Command

- Invoke the "Log" command via the command palette—or set a hotkey of your choice—to create a new line at the bottom of your daily note.

#### URL schemes

- Run the `obsidian://log` command to open Obsidian and log a new thought in your daily note at an appended line and start writing immediately.
  - On iOS, this is easy to set up via Shortcuts. Install [this shortcut](https://www.icloud.com/shortcuts/1efa6b9ee42242bd906884d3d8a52b92), add it to your homescreen, then tap the button! 
- Run the `obsidian://timber` command to create a new draft in a designated inbox folder and start writing immediately.
  -  On iOS, this is easy to set up via Shortcuts. Install [this shortcut](https://www.icloud.com/shortcuts/6594b965deab401e814aeeeb593b551d), add it to your homescreen, then tap the button! 

### Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.
