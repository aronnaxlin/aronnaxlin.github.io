import { marked } from 'https://cdnjs.cloudflare.com/ajax/libs/marked/16.2.1/lib/marked.esm.js';
const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

// Chat History
let chatHistory = [
    {
        role: "system",
        content: "You are a high-efficiency ai helper."
    }
]

// Add message to chat box
function addMessage(role, content) {
    // Chat box container
    const chatMessages = document.getElementById("chat-messages");

    // Create new elements to chat box
    const newMessage = document.createElement("div");
    const messageContent = document.createElement("div");

    // Asign class style to elements
    newMessage.className = `message ${role}-message`;
    messageContent.className = "message-content";

    // Detect the role
    if (role === "ai") {
        // if the role is ai, parse md is needed
        messageContent.innerHTML = marked.parse(content);
        // Add markdown-body class for GitHub Markdown CSS
        messageContent.classList.add('markdown-body');
    }

    else {
        // else, directly output
        messageContent.textContent = content;
    }

    newMessage.appendChild(messageContent);
    chatMessages.appendChild(newMessage);

    //scroll the content to the bottom of chatbox
    chatMessages.scrollTop = chatMessages.scrollHeight; //???
}

// Call API
function callQwenAPI() {
    // fetch API
    const API_KEY = document.getElementById("userAPI").value.trim();
    if (!API_KEY) {
        alert("Input a valid API KEY!");
    }
    // fetch Prompt
    const userPrompt = document.getElementById("userPrompt").value.trim();

    // if user inputs a custom prompt, change the system prompt content
    if (userPrompt && userPrompt != chatHistory[0].content) {
        chatHistory[0].content = userPrompt;
    }

    // get question
    const question = document.getElementById("userInput").value.trim();
    if (!question) {
        alert("Invalid Input!");
        return;
    }
    // add the user's question to chatbox
    addMessage("user", question);

    // clear input box
    document.getElementById("userInput").value = "";
    // or question.value = ""

    // add the user's question to chat history
    chatHistory.push({
        role: "user",
        content: question
    });

    // config about send button
    const sendButton = document.getElementById("sendButton");
    sendButton.disabled = true; // if the function is called, the send button is needed to be disabled to prevent multiple requests
    sendButton.textContent = "Generating...";

    const requestData = {
        model: "qwen-plus",
        // let the message to be the whole history of user's question and all past chat history
        messages: chatHistory, // so that the AI can understand the context
        temperature: 0.7,
    }

    // xhr settings
    const xhr = new XMLHttpRequest();
    xhr.open("POST", API_URL, true);

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${API_KEY}`);

    xhr.onload = function () {
        // if the request is finished, recover the send button
        sendButton.disabled = false;
        sendButton.textContent = "Send";

        // check if the site responses correctly
        if (xhr.readyState === 4 && xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            const aiResponse = response.choices[0].message.content;

            // add ai's message to chatbox
            addMessage("ai", aiResponse);

            // add ai's response to chat box
            chatHistory.push({
                role: "assistant",
                content: aiResponse
            });            
        }
        // if the site doesn't response correctly
        else{
            // connected but error occurs
            try{
                const error = JSON.parse(xhr.responseText);
                if(error.error && error.error.message){
                    showError(`Error: ${error.error.message}`);
                }else{
                    showError(`Error: ${xhr.status}-${xhr.statusText}`);
                }
            }
            catch(e){
                showError("Unknown Error");
            }
        }
    };

    // network error
    xhr.onerror = function(){
        // recover send button
        sendButton.disabled = false;
        sendButton.textContent = "Send";
        showError("Network Error!");
    };

    xhr.send(JSON.stringify(requestData));

}

function showError(){
    const chatMessages = document.getElementById("chat-messages");

    const errorElement = document.createElement('div');
    errorElement.className = 'message ai-message';

    const errorContent = document.createElement('div');
    errorContent.className = 'message-content error-message';
    errorContent.innerHTML = `
    <span class="error-icon">⚠️</span>
    <span class="error-text">${message}</span>
    `;

    errorElement.appendChild(errorContent);
    chatMessages.appendChild(errorElement);

    // scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

//   DOMContentLoaded's function: Wait for the HTML document to be fully loaded and parsed before running the code
document.addEventListener('DOMContentLoaded', function () {
    const sendButton = document.getElementById('sendButton');
    const clearButton = document.getElementById('clearButton');
    const userInput = document.getElementById('userInput');

    // Click Send button
    sendButton.addEventListener('click', callQwenAPI);

    // Press enter
    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            callQwenAPI();
        }
    });

    // Click Clear button
    clearButton.addEventListener('click', function () {
        // clear input box
        userInput.value = '';

        // clear chat box
        const chatMessages = document.getElementById("chat-messages");
        chatMessages.innerHTML = '';

        // reset chat history but keep system prompt
        const systemPrompt = chatHistory[0].content;
        chatHistory = [
            {
                role: "system",
                content: systemPrompt
            }
        ];

        // Welcome
        addMessage("ai", "Hello! How can I assist you today?");
    });
});
