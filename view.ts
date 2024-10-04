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

  protected async onOpen(): Promise<void> {
    const container = this.containerEl.children[1]
    container.empty()
    container.createEl("h2", {text: "What would you like to do with this note?"})
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
      userInput.empty()
    })
  }
}