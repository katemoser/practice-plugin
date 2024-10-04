import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_CHAT = "chat-view"

export class ChatView extends ItemView{

  constructor(leaf: WorkspaceLeaf){
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_CHAT;
  }

  getDisplayText(): string {
    return "Chat View"
  }

  async fleshOutNote(){
    const file = this.app.workspace.getActiveFile()
    if (file) {
      console.log("the currently active file is", file?.name);
			console.log("this is its content", await this.app.vault.read(file));
    }
    else{
      console.log("there is no active file")
    }
  }

  protected async onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()
    container.createEl("h2", {text: "What would you like to do with this note?"})

    const button1 = container.createEl("button", {text: "Flesh Out"})
    button1.addEventListener("click", async (evt)=>{
      console.log("Clicked Flesh out")
      await this.fleshOutNote()
    })
    const button2 = container.createEl("button", {text: "Re-organize"})
    button2.addEventListener("click", (evt)=>{
      console.log("Clicked Reorganize")
    })
    const button3 = container.createEl("button", {text: "Create Quiz"})
    button3.addEventListener("click", (evt)=>{
      console.log("Clicked Create Quiz")
    })
    // const button4 = container.createEl("button", {text: "Create Exercise"})
    // button4.addEventListener("click", (evt)=>{
    //   console.log("Clicked Create Exercise")
    // })


    const form = container.createEl("form", {})
    const userInput = form.createEl("input", {})
    userInput.setAttribute("placeholder", "Hello")
    const submitButton = form.createEl("input", {type: "submit"})
    // submitButton.onClickEvent((evt)=>
    //   evt.preventDefault()
    //   console.log("YOU CLICKED IT!")
    // )
    form.addEventListener("submit", (evt) => {
      evt.preventDefault()
      console.log("You submit the form, and the input said", userInput.value)
      userInput.value = ""
    })
  }
}