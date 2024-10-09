import { App, ItemView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, normalizePath, request } from 'obsidian';
// import { ChatView, VIEW_TYPE_CHAT } from 'view';
import fs from "fs";
import FormData from 'form-data';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	apiKey: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	apiKey: ''
}

const VIEW_TYPE_CHAT = "chat-view"
const API_ENDPOINT = "https://api.openai.com/v1/chat/completions"
const BASE_API_ENDPOINT = "https://api.openai.com/v1"

/**
 * Plugin Class
 */
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	display() :void{
		console.log("this, in display:", this);
	}

	async onload() {
		await this.loadSettings();
		// this is how you could store env variables and such:
		// console.log("This is the secret:", this.settings.mySetting)

		// TODO: figure out how to get an html element to appear
		this.registerView(
			VIEW_TYPE_CHAT,
			(leaf) =>new ChatView(leaf, this)
		)

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('brain-circuit', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('You clicked the brain!');
			this.activateView()
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// TODO: figure out how to access the current file
		const file = this.app.workspace.getActiveFile()
		if(file){
			console.log("the currently active file is", file?.name);
			console.log("this is its content", await this.app.vault.read(file));
		}



		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	}
		// });
		// This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	// this is boilerplate for activating the view
	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CHAT);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			await leaf?.setViewState({ type: VIEW_TYPE_CHAT, active: true });
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf!);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}


/**
 * Chat UI
 */

class ChatView extends ItemView{

	plugin: MyPlugin

  constructor(leaf: WorkspaceLeaf, plugin: MyPlugin){
    super(leaf);
		this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CHAT;
  }

  getDisplayText(): string {
    return "Chat View"
  }


async transcribeAudio(filePath: string) {
    try {
        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        console.log("Reading file...");

        // Create a form-data instance
        const fData = new FormData();

        // Append the audio file as a read stream
        const audioFile = fs.createReadStream(filePath);
        fData.append("file", audioFile, {
            filename: 'audio.mp3', // Provide a filename for the file
            contentType: 'audio/mpeg' // Specify the content type
        });

        // Append the Whisper model
        fData.append("model", "whisper-1");

        // Send the request with proper form-data headers
        const response = await fetch(`${BASE_API_ENDPOINT}/audio/transcriptions`, {
            method: 'POST',
            body: fData, // No need to cast as 'any' now
            headers: {
                'Authorization': `Bearer ${this.plugin.settings.apiKey}`,
                ...fData.getHeaders(), // Use the form-data headers
            }
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Transcription Text:", data);

        // Create a new note with the transcription result
        const newNote = await this.app.vault.create(
            'audio/test.md',
            data.text
        );

        if (newNote) {
            const leaf = this.app.workspace.getLeaf("split", "vertical");
            leaf.openFile(newNote);
        }

    } catch (error) {
        console.log("There was an error:", error);
    }
}


	// async transcribeAudio(filePath: string){
	// 	try {
	// 		console.log("reading stream")
	// 		const audioFile = fs.readFileSync(filePath);
	// 		console.log("readstream:", audioFile);
	// 		const fData = new FormData()
	// 		fData.append("file", audioFile, {filename:'audio.mp3', contentType:'audio/mpeg'})
	// 		// fData.append("model", "whisper-1")npm

	// 		console.log("FormData:", fData, "<---")

	// 		const response = await fetch(
	// 			`${BASE_API_ENDPOINT}/audio/transcriptions`, {
	// 				method:'POST',
	// 				body:fData as any,
	// 				headers:{
	// 					'Authorization': `Bearer ${this.plugin.settings.apiKey}`
	// 				}
	// 			})

	// 			const data = await response.json()
	// 		console.log("transcriptionTxt:", data)

	// 		// CREATE NEW NOTE
	// 		const newNote = await this.app.vault.create(
	// 			'audio/test.md',
	// 			data.text
	// 		)
	// 		// When we make a new note, we should open it:
	// 		if(newNote){
	// 			const leaf = this.app.workspace.getLeaf("split", "vertical")
	// 			leaf.openFile(newNote)
	// 		}

	// 	} catch(error){
	// 		console.log("There was an error:", error)
	// 	}

	// }

	async transcribeVideo(url: string){


	// 	ytdl('http://www.youtube.com/watch?v=aqz-KE-bpKQ')
  // .pipe(fs.createWriteStream('/tmp/test.mp4'))
	// // 	try{


	// 	console.log("Will try and download");

	// 	const info = await ytdl.getInfo(url);
	// 	console.log(info);

	// 	const pass = ytdl.downloadFromInfo(info);
	// 	console.log("pass:", pass);

	// 	// Listen to the 'progress' event from the ytdl stream
	// 	pass.on("progress", (chunkLength, downloaded, total) => {
	// 		const percent = (downloaded / total) * 100;
	// 		console.log(`Downloading: ${percent.toFixed(2)}%`);
	// 	});

	// 	// Pipe the stream into a write stream to save the audio file
	// 	const writeStream = fs.createWriteStream("./tmp/video.mp4");
	// 	console.log("write stream:", writeStream)
	// 	pass.pipe(writeStream);

	// 	// Listen for when the file has finished writing
	// 	writeStream.on("finish", () => {
	// 		console.log("Download complete!");
	// 	});

	// 	writeStream.on("error", (err) => {
	// 		console.error("Error writing file:", err);
	// 	});
	// } catch(err){
	// 	console.log("ERROR:", err)
	// }

		// console.log("will try and download")

		// const info = await ytdl.getInfo(url)
		// console.log(info)
		// const pass = ytdl.downloadFromInfo(info)
		// console.log("pass:", pass)
		// const audio = pass.pipe(fs.createWriteStream("./tmp/audio.mp3"))
		// console.log("write stream:",audio)
		// audio.on("progress", ()=>{
		// 	console.log("HELLO?")
		// })
		// audio.on("close", ()=>{
		// 	console.log("FINISHED!")
		// })

		// const outputStream = ytdl(url, {filter:'audioonly'}).pipe(fs.createWriteStream("/tmp/audio.mp3"))
		// console.log("output stream", outputStream)
		// outputStream.on('close', () =>{
		// 	console.log("FINISHED!!!!!")
		// })
	}

  async fleshOutNote(){
    const file = this.app.workspace.getActiveFile()
    if (file) {
      console.log("the currently active file is", file);
			console.log("this is its content", await this.app.vault.read(file));
			const fileContent = await this.app.vault.read(file)

			const systemPrompt = `Your job is to make a student's notes better.
			you are going to take this student's note,
			delimited by three asterisks (*** note ***), and flesh it out.
			Add more detail, add definitions, and provide examples when able.
			Return only the new rewritten note content in markdown format.
			***
			${fileContent}
			***`

			try {
				const response = await request({
					url: API_ENDPOINT,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.plugin.settings.apiKey}`
					},
					body: JSON.stringify({
						model: "gpt-4o-mini",
						temperature: .5,
						stream: false,
						messages: [
							{ role: 'system', content: systemPrompt}
						]
					})
				});
				const parsedResponse = JSON.parse(response);
				const newNoteContent = parsedResponse.choices[0].message.content
				console.log("new note content", newNoteContent)

				// TODO: CREATE NEW NOTE
				const newNote = await this.app.vault.create(
					file.parent?.path + `/AI revised ${file.name}`,
					newNoteContent
				)
				// TODO: When we make a new note, we should open it:
				if(newNote){
					const leaf = this.app.workspace.getLeaf("split", "vertical")
					leaf.openFile(newNote)
				}
    }
		catch(error: unknown){
			console.log("ERROR!", error)
		}
	}
    else{
      console.log("there is no active file")
    }
  }

  protected async onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()
    container.createEl("h2", {text: "What would you like to do?"})

    const fleshOutButton = container.createEl("button", {text: "Flesh Out"})
    fleshOutButton.addEventListener("click", async (evt)=>{
      console.log("Clicked Flesh out")
      await this.fleshOutNote()
    })

    const transcribeButton = container.createEl("button", {text: "Transcribe"})
    transcribeButton.addEventListener("click", async (evt)=>{
			const file = this.app.workspace.getActiveFile()
			if(file){
				// @ts-ignore
				await this.transcribeAudio(`${this.app.vault.adapter.basePath}/${file.path}`)

			}
    })

		// const urlInput = container.createEl("input", {})
		// const transcribeButton = container.createEl("button", {text: "Transcribe YT video"})
		// transcribeButton.addEventListener("click", async(evt)=>{
		// 	console.log("clicked transcribe, url=", urlInput.value);
		// 	this.transcribeVideo(urlInput.value)
		// })
    // const button2 = container.createEl("button", {text: "Re-organize"})
    // button2.addEventListener("click", (evt)=>{
    //   console.log("Clicked Reorganize")
    // })
    // const button3 = container.createEl("button", {text: "Create Quiz"})
    // button3.addEventListener("click", (evt)=>{
    //   console.log("Clicked Create Quiz")
    // })
    // const button4 = container.createEl("button", {text: "Create Exercise"})
    // button4.addEventListener("click", (evt)=>{
    //   console.log("Clicked Create Exercise")
    // })


    // const form = container.createEl("form", {})
    // const userInput = form.createEl("input", {})
    // userInput.setAttribute("placeholder", "Hello")
    // const submitButton = form.createEl("input", {type: "submit"})
    // // submitButton.onClickEvent((evt)=>
    // //   evt.preventDefault()
    // //   console.log("YOU CLICKED IT!")
    // // )
    // form.addEventListener("submit", (evt) => {
    //   evt.preventDefault()
    //   console.log("You submit the form, and the input said", userInput.value)
    //   userInput.value = ""
    // })
  }
}

/**
 * Settings for plugin
 */
class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your API Key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));
	}
}
