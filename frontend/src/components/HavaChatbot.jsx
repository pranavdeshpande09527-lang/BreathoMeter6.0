import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Activity } from 'lucide-react';
import { api } from '../utils/api';
import './HavaChatbot.css';

export default function HavaChatbot({ inline = false, externalOpen = null, setExternalOpen = null }) {
    const [isOpenInternal, setIsOpenInternal] = useState(false);
    const isOpen = externalOpen !== null ? externalOpen : isOpenInternal;
    const setIsOpen = setExternalOpen !== null ? setExternalOpen : setIsOpenInternal;
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'hava',
            text: "Hello, I'm Hava, your AI Breathing Assistant. How can I help you understand your air quality or breathing data today?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleToggle = () => setIsOpen(prev => !prev);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userText = inputValue;

        const newUserMessage = {
            id: Date.now(),
            sender: 'user',
            text: userText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsTyping(true);

        // Call real backend
        try {
            const response = await api.ai.chat(userText);

            const newAiMessage = {
                id: Date.now() + 1,
                sender: 'hava',
                text: response.reply || "I'm sorry, I couldn't process that.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, newAiMessage]);
        } catch (err) {
            console.error("Failed to get Hava response", err);
            const errorAiMessage = {
                id: Date.now() + 1,
                sender: 'hava',
                text: "I'm having trouble connecting right now. Please try again later.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorAiMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Chat Button (FAB) */}
            {!inline && (
                <button
                    className={`hava-fab ${isOpen ? 'hava-fab-hidden' : ''}`}
                    onClick={handleToggle}
                    aria-label="Open Hava AI Assistant"
                >
                    <MessageSquare size={24} color="#fff" />
                </button>
            )}

            {/* Chat Panel */}
            <div className={`hava-panel ${isOpen ? 'hava-panel-open' : ''}`}>
                {/* Header */}
                <div className="hava-header">
                    <div className="hava-header-info">
                        <div className="hava-avatar">
                            <Activity size={20} color="#fff" />
                        </div>
                        <div>
                            <h3 className="hava-title">Hava</h3>
                            <p className="hava-subtitle">AI Breathing Assistant</p>
                        </div>
                    </div>
                    <button className="hava-close-btn" onClick={handleToggle} aria-label="Close Chat">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                <div className="hava-messages">
                    {messages.map(msg => (
                        <div key={msg.id} className={`hava-msg-row ${msg.sender === 'user' ? 'hava-msg-user-row' : 'hava-msg-hava-row'}`}>
                            {msg.sender === 'hava' && (
                                <div className="hava-msg-avatar">
                                    <Bot size={16} color="#fff" />
                                </div>
                            )}
                            <div className={`hava-msg ${msg.sender === 'user' ? 'hava-msg-user' : 'hava-msg-hava'}`}>
                                <p className="hava-msg-text">{msg.text}</p>
                                <div className="hava-msg-time">{msg.time}</div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="hava-msg-row hava-msg-hava-row">
                            <div className="hava-msg-avatar">
                                <Bot size={16} color="#fff" />
                            </div>
                            <div className="hava-msg hava-msg-hava hava-typing">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form className="hava-input-area" onSubmit={handleSend}>
                    <input
                        type="text"
                        className="hava-input"
                        placeholder="Ask about your breathing or AQI..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="hava-send-btn"
                        disabled={!inputValue.trim() || isTyping}
                        aria-label="Send Message"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </>
    );
}
