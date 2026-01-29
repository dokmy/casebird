"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { FeatherIcon } from "@/components/ui/feather-icon";
import { cn } from "@/lib/utils";

export interface ConversationItem {
  id: string;
  title: string;
  updated_at: string;
  case_language?: string;
  generatingTitle?: boolean;
}

interface SidebarProps {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  userEmail: string;
  loading?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void | Promise<void>;
  onRenameConversation: (id: string, title: string) => void;
  onSignOut: () => void;
}

export function Sidebar({
  conversations,
  activeConversationId,
  userEmail,
  loading,
  mobileOpen,
  onMobileClose,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onSignOut,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startRename = (conv: ConversationItem) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const confirmRename = () => {
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDeleteConversation(id);
    setDeletingId(null);
  };

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id);
    onMobileClose?.();
  };

  const handleNewChatMobile = () => {
    onNewChat();
    onMobileClose?.();
  };

  // Desktop collapsed view
  if (collapsed) {
    return (
      <div className="hidden md:flex w-12 border-r border-border/50 flex-col items-center py-3 gap-3 shrink-0 bg-card/50">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Expand sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          title="New chat"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const sidebarContent = (
    <div className="w-64 border-r border-border/50 flex flex-col shrink-0 bg-card md:bg-card/50 h-full">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <FeatherIcon className="w-4 h-4" />
          <span className="font-serif text-sm font-medium">Casebird</span>
        </div>
        <button
          onClick={() => {
            if (mobileOpen) {
              onMobileClose?.();
            } else {
              setCollapsed(true);
            }
          }}
          className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Close sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={handleNewChatMobile}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 hover:bg-accent/50 transition-colors text-sm font-serif"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-xs font-serif text-muted-foreground text-center py-8 px-4">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm",
                  deletingId === conv.id && "opacity-50 scale-95",
                  activeConversationId === conv.id
                    ? "bg-accent/70 text-foreground"
                    : "hover:bg-accent/30 text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  if (editingId !== conv.id && deletingId !== conv.id) handleSelectConversation(conv.id);
                }}
              >
                {deletingId === conv.id ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                )}
                {editingId === conv.id ? (
                  <form
                    className="flex-1 flex items-center gap-1 min-w-0"
                    onSubmit={(e) => {
                      e.preventDefault();
                      confirmRename();
                    }}
                  >
                    <input
                      ref={editInputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancelRename();
                      }}
                      onBlur={confirmRename}
                      className="flex-1 min-w-0 bg-background border border-border rounded px-1.5 py-0.5 text-sm font-serif outline-none focus:ring-1 focus:ring-primary/50"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="submit"
                      className="p-0.5 rounded hover:bg-accent text-primary"
                      onClick={(e) => e.stopPropagation()}
                      title="Save"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 rounded hover:bg-accent text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelRename();
                      }}
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="font-serif truncate flex-1">
                      {conv.generatingTitle ? (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="italic">Naming...</span>
                        </span>
                      ) : (
                        conv.title
                      )}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(conv);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-all text-muted-foreground hover:text-foreground"
                      title="Rename conversation"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conv.id);
                      }}
                      disabled={deletingId === conv.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-all text-muted-foreground hover:text-red-500"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-serif text-muted-foreground truncate max-w-[130px]">
            {userEmail}
          </span>
          <div className="flex items-center gap-0.5">
            <Link
              href="/settings"
              className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={onSignOut}
              className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <div className="relative h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
