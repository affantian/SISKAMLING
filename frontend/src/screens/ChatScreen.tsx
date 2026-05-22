import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface ChatRoom {
  id: string;
  name: string;
  name_en: string;
  description: string;
  level: string;
  level_label: string;
}

interface ChatMsg {
  id: string;
  user_id: string;
  user_nama: string;
  user_role: string;
  text: string;
  created_at: string;
  is_me: boolean;
}

interface Member {
  id: string;
  nama: string;
  alamat: string;
  rt: string;
  role: string;
  mode: string;
  is_me: boolean;
}

const ROLE_LABEL: any = {
  warga: 'Warga',
  koordinator_rw: 'Koord. RW',
  koordinator_kelurahan: 'Koord. Kel.',
};

const LEVEL_COLOR: any = {
  rw: '#3B6D11',
  koord_rw: '#534AB7',
  koord_kel: '#185FA5',
};

export default function ChatScreen() {
  const { user } = useAuth();
  const lang = user?.language || 'id';
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadRooms();
    loadMembers();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
    }
  }, [selectedRoom]);

  const loadRooms = async () => {
    try {
      const res = await api.get('/api/chat/rooms');
      setRooms(res.data);
      if (res.data.length > 0 && !selectedRoom) {
        setSelectedRoom(res.data[0]);
      }
    } catch (e) {
      console.error('Rooms load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const res = await api.get(`/api/chat/messages/${roomId}`);
      setMessages(res.data);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setMessages([]);
    }
  };

  const loadMembers = async () => {
    try {
      const res = await api.get('/api/users/members');
      setMembers(res.data);
    } catch (e) {
      console.error('Members load error:', e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedRoom || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      const res = await api.post('/api/chat/messages', {
        room_id: selectedRoom.id,
        text,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: res.data.id,
          user_id: user?.id || '',
          user_nama: res.data.user_nama,
          user_role: res.data.user_role,
          text: res.data.text,
          created_at: res.data.created_at,
          is_me: true,
        },
      ]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const inviteFriend = async () => {
    const message =
      lang === 'id'
        ? `Ayo gabung Siskamling — sistem keamanan lingkungan warga jaga warga! Daftar di: https://siskamling.app`
        : `Join Siskamling — community safety system! Register at: https://siskamling.app`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ text: message });
      } else {
        await Share.share({ message });
      }
    } catch (e) {}
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3B6D11" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Sub Tabs */}
      <View style={styles.subTabs}>
        <TouchableOpacity
          style={[styles.subTab, activeTab === 'chat' && styles.subTabActive]}
          onPress={() => setActiveTab('chat')}
          testID="subtab-chat"
        >
          <Ionicons
            name="chatbubbles"
            size={16}
            color={activeTab === 'chat' ? '#3B6D11' : '#999'}
          />
          <Text
            style={[
              styles.subTabText,
              activeTab === 'chat' && styles.subTabTextActive,
            ]}
          >
            Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeTab === 'members' && styles.subTabActive]}
          onPress={() => setActiveTab('members')}
          testID="subtab-members"
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === 'members' ? '#3B6D11' : '#999'}
          />
          <Text
            style={[
              styles.subTabText,
              activeTab === 'members' && styles.subTabTextActive,
            ]}
          >
            {lang === 'id' ? 'Anggota' : 'Members'} ({members.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'chat' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Room List Horizontal */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.roomList}
            contentContainerStyle={{ padding: 12, gap: 8 }}
          >
            {rooms.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.roomChip,
                  selectedRoom?.id === r.id && styles.roomChipActive,
                ]}
                onPress={() => setSelectedRoom(r)}
                testID={`room-${r.level}`}
              >
                <View
                  style={[
                    styles.levelDot,
                    { backgroundColor: LEVEL_COLOR[r.level] },
                  ]}
                />
                <Text
                  style={[
                    styles.roomChipText,
                    selectedRoom?.id === r.id && styles.roomChipTextActive,
                  ]}
                >
                  {lang === 'id' ? r.name : r.name_en}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Messages */}
          {selectedRoom && (
            <>
              <View style={styles.chatHeader}>
                <View>
                  <Text style={styles.chatHeaderName}>
                    {lang === 'id' ? selectedRoom.name : selectedRoom.name_en}
                  </Text>
                  <Text style={styles.chatHeaderDesc}>{selectedRoom.description}</Text>
                </View>
                <View
                  style={[
                    styles.levelBadge,
                    { backgroundColor: LEVEL_COLOR[selectedRoom.level] },
                  ]}
                >
                  <Text style={styles.levelBadgeText}>{selectedRoom.level_label}</Text>
                </View>
              </View>

              <ScrollView
                ref={scrollRef}
                style={styles.messagesList}
                contentContainerStyle={{ padding: 12, gap: 8 }}
              >
                {messages.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="chatbubble-outline" size={48} color="#CCC" />
                    <Text style={styles.emptyText}>
                      {lang === 'id'
                        ? 'Belum ada pesan. Mulai percakapan!'
                        : 'No messages yet. Start a conversation!'}
                    </Text>
                  </View>
                ) : (
                  messages.map((m) => (
                    <View
                      key={m.id}
                      style={[
                        styles.message,
                        m.is_me ? styles.messageMine : styles.messageOther,
                      ]}
                    >
                      {!m.is_me && (
                        <View style={styles.msgHeader}>
                          <Text style={styles.msgUser}>{m.user_nama}</Text>
                          {m.user_role !== 'warga' && (
                            <Text style={styles.msgRole}>
                              {ROLE_LABEL[m.user_role]}
                            </Text>
                          )}
                        </View>
                      )}
                      <Text
                        style={[
                          styles.msgText,
                          m.is_me && styles.msgTextMine,
                        ]}
                      >
                        {m.text}
                      </Text>
                      <Text
                        style={[
                          styles.msgTime,
                          m.is_me && styles.msgTimeMine,
                        ]}
                      >
                        {new Date(m.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Input */}
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.input}
                  placeholder={lang === 'id' ? 'Ketik pesan...' : 'Type a message...'}
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={sendMessage}
                  testID="chat-input"
                />
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={sendMessage}
                  disabled={sending}
                  testID="chat-send-button"
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      ) : (
        // Members Tab
        <ScrollView style={{ flex: 1 }}>
          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>
              {lang === 'id' ? `Warga RW ${user?.rw}` : `RW ${user?.rw} Residents`}
            </Text>
            <TouchableOpacity
              style={styles.inviteBtn}
              onPress={inviteFriend}
              testID="invite-friend-button"
            >
              <Ionicons name="person-add" size={14} color="#fff" />
              <Text style={styles.inviteBtnText}>
                {lang === 'id' ? 'Undang Teman' : 'Invite Friend'}
              </Text>
            </TouchableOpacity>
          </View>

          {members.map((m) => (
            <View key={m.id} style={styles.memberItem}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>
                  {m.nama.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.memberRow}>
                  <Text style={styles.memberName}>
                    {m.nama} {m.is_me && '(Anda)'}
                  </Text>
                  {m.role !== 'warga' && (
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>{ROLE_LABEL[m.role]}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberAlamat} numberOfLines={1}>
                  RT {m.rt} · {m.alamat}
                </Text>
              </View>
              <View
                style={[
                  styles.modeDot,
                  { backgroundColor: m.mode === 'rumah' ? '#3B6D11' : '#BA7517' },
                ]}
              />
            </View>
          ))}

          {members.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>
                {lang === 'id' ? 'Belum ada anggota' : 'No members yet'}
              </Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  subTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: { borderBottomColor: '#3B6D11' },
  subTabText: { fontSize: 13, color: '#999', fontWeight: '600' },
  subTabTextActive: { color: '#3B6D11' },
  roomList: { maxHeight: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
  },
  roomChipActive: { backgroundColor: '#E8F5E9' },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  roomChipText: { fontSize: 12, color: '#666', fontWeight: '600' },
  roomChipTextActive: { color: '#3B6D11' },
  chatHeader: {
    backgroundColor: '#fff',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  chatHeaderName: { fontSize: 14, fontWeight: '600', color: '#333' },
  chatHeaderDesc: { fontSize: 11, color: '#666', marginTop: 2 },
  levelBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10 },
  levelBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  messagesList: { flex: 1 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 13, color: '#999', marginTop: 12 },
  message: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
  },
  messageOther: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  messageMine: {
    backgroundColor: '#3B6D11',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  msgHeader: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  msgUser: { fontSize: 11, fontWeight: '600', color: '#3B6D11' },
  msgRole: { fontSize: 9, color: '#666', fontWeight: '600' },
  msgText: { fontSize: 14, color: '#333' },
  msgTextMine: { color: '#fff' },
  msgTime: { fontSize: 9, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
  msgTimeMine: { color: '#E8F5E9' },
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    gap: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B6D11',
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  membersTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B6D11',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  inviteBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  memberItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: { fontSize: 18, fontWeight: 'bold', color: '#3B6D11' },
  memberInfo: { flex: 1 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#333' },
  roleBadge: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  roleBadgeText: { fontSize: 9, color: '#BA7517', fontWeight: '700' },
  memberAlamat: { fontSize: 11, color: '#666', marginTop: 2 },
  modeDot: { width: 10, height: 10, borderRadius: 5 },
});
