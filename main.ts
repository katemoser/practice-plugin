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

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
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

	async createOutline(outlinePrompt: string){
		console.log("Create Outline! prompt:", outlinePrompt);

		const file = this.app.workspace.getActiveFile()
		console.log("FILE:", file)
		const path = file ? file.parent?.path : ""

			const systemPrompt = `Make me a notes outline of ${outlinePrompt}.
			This outline should start with 3-6 questions to keep in mind while reading.
			this should just be a basic outline of the big ideas, but I am going to use
			it and fill in all the important details as i read the chapter`

			const messages = [{role:'system', content: systemPrompt}];

			const newNoteContent = await this.talkToApi(messages);

			// Create new note
			const newNote = await this.app.vault.create(
				path + `/Outline for ${outlinePrompt}`,
				newNoteContent
			)

			// If successful, open new note
			if(newNote){
				const leaf = this.app.workspace.getLeaf("split", "vertical")
				leaf.openFile(newNote)
			}
	}

	async createQuiz(){
		console.log("create quiz!");

		const file = this.app.workspace.getActiveFile()
		if (file){
			const fileContent = await this.app.vault.read(file)

		const systemPrompt = `Your job is to make quiz out of this student's note.
			you are going to take this student's note,
			delimited by three asterisks (*** note ***), and create a quiz out of its content.
			There should be a question for each importnat term in this note.
			There should be at least 5 -10 conceptual questions.
			Return only the quiz in a markdown table with two columns: question and answer.
			***
			${fileContent}
			***`
			const messages = [{
				role:'system', content: systemPrompt
			}]

			const newNoteContent = await this.talkToApi(messages)

			// Create new note
			const newNote = await this.app.vault.create(
				file.parent?.path + `/AI Quiz for ${file.name}`,
				newNoteContent
			)

			// If successful, open new note
			if(newNote){
				const leaf = this.app.workspace.getLeaf("split", "vertical")
				leaf.openFile(newNote)
			}
		}
		else {
			console.log("ERROR: No active file. Plaese open a note.")
		}


	}

	async talkToApi(messages){
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
				messages: messages
			})
		});

		const responseContent = JSON.parse(response).choices[0].message.content;
		return responseContent

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


		const outlinePromptInput = container.createEl("input", {title:"Section"})
		const createOutlineButton = container.createEl("button", {text: "Create Outline"});
		createOutlineButton.addEventListener("click", async (evt)=>{
			console.log("Clicked create outline")
			await this.createOutline(outlinePromptInput.value)
		})

    const fleshOutButton = container.createEl("button", {text: "Flesh Out"})
    fleshOutButton.addEventListener("click", async (evt)=>{
      console.log("Clicked Flesh out")
      await this.fleshOutNote()
    })

		const createQuizButton = container.createEl("button", {text: "Make Quiz"});
		createQuizButton.addEventListener("click", async (evt)=>{
			console.log("Clicked Create Quiz");
			await this. createQuiz()
		})
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
