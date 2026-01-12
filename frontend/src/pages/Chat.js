import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Chat() {
  const { user } = useOutletContext();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages(selectedGroup);
      const interval = setInterval(() => fetchMessages(selectedGroup), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/groups`, { credentials: 'include' });
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchMessages = async (groupId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/messages/${groupId}`, { credentials: 'include' });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: groupName })
      });
      
      if (response.ok) {
        toast.success('Group created');
        setDialogOpen(false);
        setGroupName('');
        fetchGroups();
      } else {
        toast.error('Failed to create group');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/groups/${groupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast.success('Group deleted');
        setSelectedGroup(null);
        fetchGroups();
      } else {
        toast.error('Failed to delete group');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ group_id: selectedGroup, content: messageText })
      });
      
      if (response.ok) {
        setMessageText('');
        fetchMessages(selectedGroup);
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const isAdmin = user?.role === 'Admin';

  return (
    <div data-testid="chat-page" className="h-[calc(100vh-10rem)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Team Chat</h1>
          <p className="text-slate-600">Communicate with your team</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-group-btn" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Chat Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                  <Input
                    data-testid="group-name-input"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" data-testid="group-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                  Create Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4 h-full">
        {/* Groups Sidebar */}
        <Card className="border-slate-200 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Groups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-0 px-4 pb-4">
            {groups.map((group) => (
              <div
                key={group.group_id}
                data-testid="chat-group-item"
                onClick={() => setSelectedGroup(group.group_id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors flex justify-between items-center ${
                  selectedGroup === group.group_id ? 'bg-sky-50 text-sky-600' : 'hover:bg-slate-50'
                }`}
              >
                <span className="font-medium">{group.name}</span>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.group_id);
                    }}
                    data-testid="delete-group-btn"
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {groups.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-4">No groups yet</p>
            )}
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="border-slate-200 md:col-span-3 flex flex-col">
          {selectedGroup ? (
            <>
              <CardHeader>
                <CardTitle className="text-lg font-heading">
                  {groups.find(g => g.group_id === selectedGroup)?.name || 'Chat'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3 max-h-[50vh]">
                {messages.map((msg) => (
                  <div key={msg.message_id} data-testid="chat-message" className={`flex ${
                    msg.user_id === user?.user_id ? 'justify-end' : 'justify-start'
                  }`}>
                    <div className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.user_id === user?.user_id ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-900'
                    }`}>
                      {msg.user_id !== user?.user_id && (
                        <div className="text-xs font-medium mb-1 opacity-70">{msg.user_name}</div>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200">
                <div className="flex space-x-2">
                  <Input
                    data-testid="message-input"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" data-testid="send-message-btn" className="bg-slate-900 hover:bg-slate-800">
                    Send
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Select a group to start chatting</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}