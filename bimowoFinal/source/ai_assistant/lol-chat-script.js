// LOL符文之地AI助手核心类
class LOLAIChat {
    // 初始化配置
    constructor() {
        // 状态变量

        //IMPORTANT: YOU NEED TO ENTER YOUR OWN API KEY HERE
        LOLAIChat.apiKey = "sk-4aa6bcabc3d74b239bd8aedbd71fc867";
        //IMPORTANT!!
        
        LOLAIChat.baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
        LOLAIChat.messages = [
            {
                role: "system",
                content: "你是符文之地的AI助手，熟悉英雄联盟所有英雄技能、出装和对线技巧。用游戏世界观的语言回答，拒绝与LOL无关的问题。"
            }
        ];
        LOLAIChat.isMinimized = false;
        LOLAIChat.isProcessing = false;
        LOLAIChat.isVisible = false;
        
        // 初始化
        LOLAIChat.init();
    }

    // 初始化函数
    static init() {
        // 绑定元素
        LOLAIChat.elements = {
            summonerBtn: window.parent.document.getElementById("ai-button"),
            chatContainer: document.getElementById('lolChatContainer'),
            chatBody: document.getElementById('lolChatBody'),
            chatMessages: document.getElementById('lolChatMessages'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            clearBtn: document.getElementById('clearBtn'),
        };

        const aiContainer = window.parent.document.getElementById("ai-assistant-container");

        LOLAIChat.elements.summonerBtn.addEventListener('click', () => {
            aiContainer.style.display = aiContainer.style.display === 'none' ? 'block' : 'none';
        });

        // 初始隐藏聊天窗口
        LOLAIChat.elements.chatContainer.classList.remove('active');
        
        // 绑定事件
        LOLAIChat.bindEvents();
        
        // 加载历史记录
        LOLAIChat.loadChatHistory();
    }

    // 绑定所有事件
    static bindEvents() {
        // 召唤助手按钮
        LOLAIChat.elements.summonerBtn.addEventListener('click', () => {
            LOLAIChat.toggleChatVisibility();
        });

        // 发送按钮
        LOLAIChat.elements.sendBtn.addEventListener('click', () => {
            LOLAIChat.sendMessage();
        });

        // 回车发送消息
        LOLAIChat.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                LOLAIChat.sendMessage();
            }
        });

        // 清空按钮
        LOLAIChat.elements.clearBtn.addEventListener('click', () => {
            LOLAIChat.clearChat();
        });
    }

    // 切换聊天窗口显示/隐藏
    static toggleChatVisibility() {
        if (LOLAIChat.isVisible) {
            LOLAIChat.hideChat();
        } else {
            LOLAIChat.showChat();
        }
    }

    // 显示聊天窗口
    static showChat() {
        LOLAIChat.elements.chatContainer.classList.add('active');
        LOLAIChat.isVisible = true;
    }

    // 隐藏聊天窗口
    static hideChat() {
        LOLAIChat.elements.chatContainer.classList.remove('active');
        LOLAIChat.isVisible = false;
    }

    // 切换最小化状态
    static toggleMinimize() {
        if (LOLAIChat.isMinimized) {
            LOLAIChat.elements.chatBody.style.display = 'flex';
            LOLAIChat.elements.minimizeBtn.textContent = '−';
            LOLAIChat.isMinimized = false;
        } else {
            LOLAIChat.elements.chatBody.style.display = 'none';
            LOLAIChat.elements.minimizeBtn.textContent = '+';
            LOLAIChat.isMinimized = true;
        }
    }

    // 发送消息
    static sendMessage() {
        if (LOLAIChat.isProcessing) return;
        
        const messageInput = LOLAIChat.elements.messageInput;
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        // 添加用户消息
        LOLAIChat.addMessage('user', message);
        messageInput.value = '';
        
        // 显示加载状态
        LOLAIChat.showTypingIndicator();
        LOLAIChat.isProcessing = true;
        
        // 调用API
        LOLAIChat.callAIAPI(message)
            .catch(error => {
                console.error('API调用错误:', error);
                LOLAIChat.addMessage('bot', '抱歉，召唤师，我的魔法暂时中断了，请稍后再试。');
                LOLAIChat.hideTypingIndicator();
                LOLAIChat.isProcessing = false;
            });
    }

    // 调用AI API
    static async callAIAPI(userMessage) {
        // 添加用户消息到历史
        LOLAIChat.messages.push({ role: "user", content: userMessage });
        
        try {
            // 检查API密钥
            if (!LOLAIChat.apiKey.trim()) {
                throw new Error("未配置有效的API密钥");
            }
            
            const response = await fetch(LOLAIChat.baseURL + '/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LOLAIChat.apiKey.trim()}`
                },
                body: JSON.stringify({
                    model: "qwen-plus",
                    messages: LOLAIChat.messages,
                    stream: true,
                    max_tokens: 2000
                })
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            if (!response.body) {
                throw new Error('响应内容为空');
            }
            
            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let fullText = '';
            
            // 创建消息容器
            const messageDiv = LOLAIChat.createBotMessageContainer();
            const messageContent = messageDiv.querySelector('.message-content p');
            
            // 读取流数据
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split(/\n\n/);
                buffer = events.pop() || '';
                
                for (const evt of events) {
                    const lines = evt.split(/\n/);
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith('data:')) continue;
                        
                        const dataStr = trimmed.slice(5).trim();
                        if (dataStr === '[DONE]') {
                            LOLAIChat.messages.push({ role: "assistant", content: fullText });
                            LOLAIChat.saveChatHistory();
                            LOLAIChat.hideTypingIndicator();
                            LOLAIChat.isProcessing = false;
                            return fullText;
                        }
                        
                        try {
                            const json = JSON.parse(dataStr);
                            const delta = json?.choices?.[0]?.delta?.content ?? '';
                            
                            if (delta) {
                                fullText += delta;
                                LOLAIChat.updateMessageWithMarkdown(messageContent, fullText);
                            }
                        } catch (error) {
                            console.error('解析错误:', error);
                        }
                    }
                }
            }
            
            LOLAIChat.hideTypingIndicator();
            LOLAIChat.isProcessing = false;
            return fullText;
        } catch (error) {
            console.error('API错误:', error);
            throw error;
        }
    }

    // 添加消息到界面
    static addMessage(role, content) {
        const chatMessages = LOLAIChat.elements.chatMessages;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const avatar = role === 'user' ? '👤' : '🔮';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <p>${LOLAIChat.escapeHtml(content)}</p>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        LOLAIChat.scrollToBottom();
        return messageDiv;
    }

    // 创建机器人消息容器
    static createBotMessageContainer() {
        const chatMessages = LOLAIChat.elements.chatMessages;
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">🔮</div>
            <div class="message-content">
                <p></p>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        LOLAIChat.scrollToBottom();
        return messageDiv;
    }

    // 更新消息内容（支持Markdown）
    static updateMessageWithMarkdown(messageElement, content) {
        if (!messageElement) return;
        
        const html = LOLAIChat.renderMarkdown(content);
        if (html !== null) {
            messageElement.innerHTML = html;
        } else {
            messageElement.textContent = content;
        }
        
        LOLAIChat.scrollToBottom();
    }

    // 渲染Markdown
    static renderMarkdown(text) {
        if (!LOLAIChat.isMarkedReady()) return null;
        
        try {
            if (typeof window.marked.parse === 'function') {
                return window.marked.parse(text);
            }
            if (typeof window.marked === 'function') {
                return window.marked(text);
            }
        } catch (error) {
            console.error('Markdown渲染失败:', error);
        }
        
        return null;
    }

    // 检查Marked库是否加载
    static isMarkedReady() {
        return typeof window.marked !== 'undefined';
    }

    // 显示输入状态指示器
    static showTypingIndicator() {
        LOLAIChat.hideTypingIndicator();
        
        const chatMessages = LOLAIChat.elements.chatMessages;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">🔮</div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        LOLAIChat.scrollToBottom();
    }

    // 隐藏输入状态指示器
    static hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // 滚动到底部
    static scrollToBottom() {
        const chatMessages = LOLAIChat.elements.chatMessages;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // HTML转义
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 保存聊天历史
    static saveChatHistory() {
        try {
            localStorage.setItem('lolChatHistory', JSON.stringify(LOLAIChat.messages));
        } catch (error) {
            console.error('保存历史失败:', error);
        }
    }

    // 加载聊天历史
    static loadChatHistory() {
        try {
            const savedHistory = localStorage.getItem('lolChatHistory');
            if (savedHistory) {
                LOLAIChat.messages = JSON.parse(savedHistory);
                // 显示历史消息（跳过系统消息）
                const userMessages = LOLAIChat.messages.filter(m => m.role !== 'system');
                userMessages.forEach(msg => {
                    LOLAIChat.addMessage(msg.role === 'user' ? 'user' : 'bot', msg.content);
                });
            }
        } catch (error) {
            console.error('加载历史失败:', error);
            LOLAIChat.resetMessages();
        }
    }

    // 重置消息
    static resetMessages() {
        LOLAIChat.messages = [
            {
                role: "system",
                content: "你是符文之地的AI助手，熟悉英雄联盟所有英雄技能、出装和对线技巧。用游戏世界观的语言回答，拒绝与LOL无关的问题。"
            }
        ];
    }

    // 清空聊天记录
    static clearChat() {
        if (confirm('确定要清空所有聊天记录吗，召唤师？')) {
            localStorage.removeItem('lolChatHistory');
            LOLAIChat.resetMessages();
            
            const chatMessages = LOLAIChat.elements.chatMessages;
            chatMessages.innerHTML = `
                <div class="message bot-message">
                    <div class="message-avatar">🔮</div>
                    <div class="message-content">
                        <p>欢迎来到符文之地！我能为你解答英雄出装、对线技巧、版本资讯等问题，召唤师有什么需求？</p>
                    </div>
                </div>
            `;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化LOL AI助手
    const lolChat = new LOLAIChat();
    
    // 等待Marked库加载完成后升级渲染
    function upgradeRenderWhenReady() {
        if (LOLAIChat.isMarkedReady()) {
            const botMessages = document.querySelectorAll('.bot-message .message-content p');
            botMessages.forEach(messageElement => {
                if (messageElement.textContent && messageElement.innerHTML === messageElement.textContent) {
                    LOLAIChat.updateMessageWithMarkdown(messageElement, messageElement.textContent);
                }
            });
            return;
        }
        setTimeout(upgradeRenderWhenReady, 500);
    }
    
    upgradeRenderWhenReady();
});