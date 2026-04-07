import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { ArrowLeft, Send } from 'lucide-react';

export default function AppointmentChat() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const currentUser = JSON.parse(sessionStorage.getItem('user_data') || localStorage.getItem('user_data') || '{}');

    useEffect(() => {
        if (!currentUser || !currentUser.id) {
            navigate('/login');
            return;
        }
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const res = await api.appointments.getMessages(id);
            if (res && res.messages) {
                setMessages(res.messages);
            }
            setLoading(false);
        } catch (e) {
            console.error("Failed to load messages", e);
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const attemptMsg = newMessage;
        setNewMessage('');
        try {
            await api.appointments.sendMessage(id, attemptMsg);
            fetchMessages(); // Immediately pull new msgs
        } catch (e) {
            console.error("Failed to send message", e);
            setNewMessage(attemptMsg); // Restore on fail
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleBack = () => {
        // 1. Check URL query params first (Source of truth for the portal we came from)
        const params = new URLSearchParams(window.location.search);
        const urlRole = params.get('role')?.toLowerCase();

        // 2. Metadata identification for standalone/deep links
        const metadataRole = currentUser.user_metadata?.role?.toLowerCase();
        const topRole = currentUser.role?.toLowerCase();
        
        // HEURISTIC: Does the name start with 'Dr. '?
        const displayName = currentUser.user_metadata?.full_name || '';
        const email = currentUser.email || '';
        const isDoctorHint = displayName.toLowerCase().startsWith('dr. ') || email.toLowerCase().startsWith('dr.');

        const dbRole = (metadataRole && metadataRole !== 'authenticated') ? metadataRole : (isDoctorHint ? 'doctor' : topRole);
        
        // PRIORITY: Use explicitly passed role if available, otherwise data
        const finalRole = urlRole || dbRole;
        
        console.log(`[ChatNav] Back intent. urlRole: ${urlRole}, Detected: ${dbRole}, Routing to: ${finalRole}`);

        if (finalRole === 'doctor') {
            navigate('/doctor/dashboard');
        } else {
            navigate('/dashboard');
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p>Loading chat...</p>
            </div>
        );
    }

    return (
        <div className="page-container chat-page fade-in" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <div className="chat-header" style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button className="btn btn-icon" onClick={handleBack}>
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Consultation Chat</h2>
                    <p className="text-meta" style={{ margin: 0 }}>Appointment ID: {id}</p>
                </div>
            </div>

            <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-meta)', marginTop: '40px' }}>
                        No messages yet. Send a message to start the consultation.
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMine = msg.sender_id === currentUser.id;
                        return (
                            <div key={index} style={{
                                alignSelf: isMine ? 'flex-end' : 'flex-start',
                                maxWidth: '70%',
                                background: isMine ? 'var(--primary)' : 'var(--card-bg)',
                                color: isMine ? 'white' : 'var(--text-primary)',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                borderBottomRightRadius: isMine ? '4px' : '12px',
                                borderBottomLeftRadius: isMine ? '12px' : '4px',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <p style={{ margin: 0, fontSize: '0.95rem' }}>{msg.content}</p>
                                <span style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '5px', display: 'block', textAlign: 'right' }}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSend} style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    style={{ flex: 1, borderRadius: '20px', paddingLeft: '20px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ borderRadius: '50%', width: '45px', height: '45px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={!newMessage.trim()}>
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
