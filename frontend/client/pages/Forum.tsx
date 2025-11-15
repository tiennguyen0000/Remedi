import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ForumPost as ForumPostType,
  CreatePostRequest,
  CreateCommentRequest,
} from "@shared/forumTypes";
import { ForumPost } from "./forum/ForumPost";
import { CreatePost } from "./forum/CreatePost";
import { Loader2, Search, Filter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";

export default function Forum() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ForumPostType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most_comments">("newest");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiFetch(`/api/forum/posts`)) as any[];
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      setError("Không thể tải bài viết. Vui lòng thử lại sau.");
      console.error("Error fetching posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Get all unique tags from posts
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    posts.forEach((post) => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [posts]);

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      if (query.length > 0) {
        filtered = filtered.filter((post) => {
          try {
            const title = (post.title || "").toString().toLowerCase();
            const content = (post.content || "").toString().toLowerCase();
            const author = (post.authorName || "").toString().toLowerCase();

            // Search in tags as well (if any tag contains the query)
            const tagsMatch = (post.tags || []).some((t: any) =>
              (t || "").toString().toLowerCase().includes(query)
            );

            return (
              title.includes(query) ||
              content.includes(query) ||
              author.includes(query) ||
              tagsMatch
            );
          } catch (err) {
            // If any error occurs while processing a post, skip it from results
            console.warn("Forum search: skipping post due to error", err, post);
            return false;
          }
        });
      }
    }

    // Tag filter
    if (filterTag !== "all") {
      filtered = filtered.filter(
        (post) => post.tags && post.tags.includes(filterTag)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "most_comments":
          return (b.comments?.length || 0) - (a.comments?.length || 0);
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [posts, searchQuery, filterTag, sortBy]);

  const handleCreatePost = async (post: CreatePostRequest) => {
    if (!user) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đăng nhập để đăng bài",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert imageUrl to images array if provided
      const postData: any = {
        title: post.title,
        content: post.content,
        tags: post.tags || [],
        images: post.imageUrl ? [post.imageUrl] : post.images || [],
        attachments: post.attachments || [],
      };

      const newPost = (await apiFetch("/api/forum/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      })) as any;
      setPosts([newPost, ...posts]);
      setShowCreatePost(false);
      toast({
        title: "Thành công",
        description: "Đã tạo bài viết mới",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo bài viết",
        variant: "destructive",
      });
    }
  };

  const handleEditPost = async (
    postId: string,
    title: string,
    content: string,
    tags?: string[],
    images?: string[],
  ) => {
    if (!user) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đăng nhập",
        variant: "destructive",
      });
      return;
    }

    try {
      const updated = (await apiFetch(`/api/forum/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          content,
          tags: tags || [],
          images: images || [],
        }),
      })) as any;
      setPosts(posts.map((p) => (p.id === postId ? updated : p)));
      toast({
        title: "Thành công",
        description: "Đã cập nhật bài viết",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật bài viết",
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đăng nhập",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiFetch(`/api/forum/posts/${postId}`, { method: "DELETE" });
      setPosts(posts.filter((p) => p.id !== postId));
      toast({
        title: "Thành công",
        description: "Đã xóa bài viết",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa bài viết",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async (
    postId: string,
    comment: CreateCommentRequest,
  ) => {
    if (!user) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đăng nhập để bình luận",
        variant: "destructive",
      });
      return;
    }

    try {
      const newComment = (await apiFetch(`/api/forum/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(comment),
      })) as any;
      setPosts(
        posts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              comments: [...(post.comments || []), newComment],
            };
          }
          return post;
        }),
      );
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm bình luận",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Diễn đàn</h1>
            <p className="text-muted-foreground mt-1">
              Thảo luận, chia sẻ và học hỏi cùng cộng đồng
            </p>
          </div>
          {user && (
            <Button
              onClick={() => setShowCreatePost(true)}
              className="gap-2"
              size="lg"
            >
              <Plus className="h-4 w-4" />
              Tạo bài viết mới
            </Button>
          )}
        </div>

        {/* Create Post */}
        {user && showCreatePost && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tạo bài viết mới</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreatePost(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <CreatePost
                onSubmit={async (post) => {
                  await handleCreatePost(post);
                  setShowCreatePost(false);
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Welcome Message for non-authenticated users */}
        {!user && (
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">
                  Chào mừng đến với Diễn đàn
                </h2>
                <p className="text-muted-foreground mb-4">
                  Đăng nhập để tham gia thảo luận và chia sẻ ý kiến của bạn.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm bài viết, tác giả..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Lọc:</span>
                </div>
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Tất cả tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả tags</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Mới nhất</SelectItem>
                    <SelectItem value="oldest">Cũ nhất</SelectItem>
                    <SelectItem value="most_comments">Nhiều bình luận nhất</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || filterTag !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterTag("all");
                    }}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Xóa bộ lọc
                  </Button>
                )}
              </div>

              {/* Active Filters */}
              {(searchQuery || filterTag !== "all") && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Bộ lọc đang áp dụng:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Tìm kiếm: "{searchQuery}"
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSearchQuery("")}
                      />
                    </Badge>
                  )}
                  {filterTag !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Tag: {filterTag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setFilterTag("all")}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-center text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Posts List */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  {posts.length === 0
                    ? "Chưa có bài viết nào. Hãy là người đầu tiên tạo bài viết!"
                    : "Không tìm thấy bài viết nào phù hợp với bộ lọc của bạn."}
                </p>
                {posts.length > 0 && (searchQuery || filterTag !== "all") && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterTag("all");
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              Hiển thị {filteredPosts.length} / {posts.length} bài viết
            </div>
            {filteredPosts.map((post) => (
              <ForumPost
                key={post.id}
                post={post}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
                onComment={handleAddComment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
