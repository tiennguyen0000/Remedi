import React, { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  ForumPost as ForumPostType,
  CreateCommentRequest,
} from "@shared/forumTypes";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { MessageCircle, Trash2, PenLine, MoreVertical, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper function to format message content
const formatMessageContent = (content: string) => {
  if (!content) return "";
  
  // Replace markdown-style formatting
  let formatted = content
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Code: `text`
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-gray-200 rounded text-xs">$1</code>');
  
  return formatted;
};

interface ForumPostProps {
  post: ForumPostType;
  onEdit: (postId: string, title: string, content: string, tags?: string[], images?: string[]) => Promise<void>;
  onDelete: (postId: string) => Promise<void>;
  onComment: (postId: string, comment: CreateCommentRequest) => Promise<void>;
}

export function ForumPost({
  post,
  onEdit,
  onDelete,
  onComment,
}: ForumPostProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: post.title,
    content: post.content,
    tags: post.tags || [],
    images: post.images || [],
  });
  const [newComment, setNewComment] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canModify =
    user && (user.id === post.authorId || user.role === "ADMIN");

  const formatDate = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = Math.abs(now.getTime() - postDate.getTime()) / 36e5;

    if (diffInHours < 24) {
      return formatDistanceToNow(postDate, { addSuffix: true, locale: vi });
    }
    return format(postDate, "HH:mm dd/MM/yyyy");
  };

  const handleEdit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await onEdit(post.id, editForm.title, editForm.content, editForm.tags, editForm.images);
      setIsEditing(false);
      toast({ description: "Cập nhật thành công" });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật bài viết",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await onDelete(post.id);
      setIsDeleteDialogOpen(false);
      toast({ description: "Xóa thành công" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Không thể xóa bài viết",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComment = async () => {
    if (!user || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await onComment(post.id, { content: newComment });
      setNewComment("");
      toast({ description: "Đã thêm bình luận" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Không thể thêm bình luận",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>{post.authorName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{post.title}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    {post.authorName} · {formatDate(post.createdAt)}
                  </p>
                  {post.updatedAt && post.updatedAt !== post.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      · Đã chỉnh sửa {formatDate(post.updatedAt)}
                    </p>
                  )}
                  {post.views !== undefined && post.views > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      <span>{post.views}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {canModify && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <PenLine className="mr-2 h-4 w-4" />
                    Chỉnh sửa
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Xóa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tiêu đề *</label>
                <Input
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  placeholder="Tiêu đề bài viết"
                  className="font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Nội dung *</label>
                <Textarea
                  value={editForm.content}
                  onChange={(e) =>
                    setEditForm({ ...editForm, content: e.target.value })
                  }
                  rows={6}
                  placeholder="Nội dung bài viết"
                  required
                />
              </div>
              {/* Tags display (read-only in edit mode for now) */}
              {editForm.tags && editForm.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {editForm.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tags không thể chỉnh sửa. Vui lòng tạo bài viết mới để thay đổi tags.
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({ 
                      title: post.title, 
                      content: post.content,
                      tags: post.tags || [],
                      images: post.images || [],
                    });
                  }}
                >
                  Hủy
                </Button>
                <Button onClick={handleEdit} disabled={isSubmitting || !editForm.title.trim() || !editForm.content.trim()}>
                  {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div 
                className="mb-6"
                style={{ whiteSpace: 'pre-line' }}
                dangerouslySetInnerHTML={{ 
                  __html: formatMessageContent(post.content) 
                }}
              />
              
              {/* Images */}
              {(post.images && post.images.length > 0) || post.imageUrl ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {post.images?.map((imageUrl, index) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`${post.title} - ${index + 1}`}
                      className="max-h-96 w-full object-contain rounded-md border"
                    />
                  ))}
                  {post.imageUrl && !post.images?.includes(post.imageUrl) && (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="max-h-96 w-full object-contain rounded-md border"
                    />
                  )}
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    Bình luận ({post.comments.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => setIsCommentOpen(!isCommentOpen)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Bình luận
                  </Button>
                </div>

                {isCommentOpen && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Viết bình luận..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button
                      onClick={handleComment}
                      disabled={!newComment.trim() || isSubmitting}
                    >
                      Gửi
                    </Button>
                  </div>
                )}

                <div className="space-y-4">
                  {post.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex gap-3 rounded-lg bg-muted/50 p-3"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>{comment.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {comment.authorName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <div 
                          className="text-sm mt-1"
                          style={{ whiteSpace: 'pre-line' }}
                          dangerouslySetInnerHTML={{ 
                            __html: formatMessageContent(comment.content) 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Bài viết sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
