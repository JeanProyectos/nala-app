import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import * as api from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '../../../components/AnimatedButton';
import AnimatedCard from '../../../components/AnimatedCard';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../styles/theme';

const POST_TYPES = {
  CLINICAL_CASE: 'Caso Clínico',
  FORUM_DISCUSSION: 'Discusión',
  ARTICLE: 'Artículo',
};

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, CLINICAL_CASE, FORUM_DISCUSSION, ARTICLE
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [filter, searchText])
  );

  const loadPosts = async (pageNum = 1) => {
    try {
      setLoading(pageNum === 1);
      const query = {
        page: pageNum,
        limit: 10,
      };

      if (filter !== 'all') {
        query.type = filter;
      }

      if (searchText.trim()) {
        query.search = searchText.trim();
      }

      const response = await api.getCommunityPosts(query);
      setPosts(pageNum === 1 ? response.data : [...posts, ...response.data]);
      setHasMore(response.page < response.lastPage);
      setPage(pageNum);
    } catch (error) {
      console.error('Error cargando posts:', error);
      Alert.alert('Error', 'No se pudieron cargar los posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadPosts(1);
  };

  const handleLike = async (postId) => {
    try {
      await api.togglePostLike(postId);
      // Actualizar el estado local
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, liked: !post.liked, _count: { ...post._count, likes: post.liked ? post._count.likes - 1 : post._count.likes + 1 } }
          : post
      ));
    } catch (error) {
      console.error('Error al dar like:', error);
      Alert.alert('Error', 'No se pudo actualizar el like');
    }
  };

  const handleFavorite = async (postId) => {
    try {
      await api.togglePostFavorite(postId);
      // Actualizar el estado local
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, favorited: !post.favorited }
          : post
      ));
    } catch (error) {
      console.error('Error al guardar favorito:', error);
      Alert.alert('Error', 'No se pudo actualizar el favorito');
    }
  };

  const getPostTypeIcon = (type) => {
    switch (type) {
      case 'CLINICAL_CASE':
        return '🏥';
      case 'FORUM_DISCUSSION':
        return '💬';
      case 'ARTICLE':
        return '📄';
      default:
        return '📝';
    }
  };

  const getPostTypeColor = (type) => {
    switch (type) {
      case 'CLINICAL_CASE':
        return '#4CAF50';
      case 'FORUM_DISCUSSION':
        return '#2196F3';
      case 'ARTICLE':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B7FA8" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Comunidad Veterinaria</Text>
          {user?.role === 'VET' && (
            <AnimatedButton
              style={styles.createButton}
              onPress={() => router.push('/community/create-post')}
            >
              <Ionicons name="add-circle" size={24} color={COLORS.textWhite} />
              <Text style={styles.createButtonText}>Crear</Text>
            </AnimatedButton>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar posts..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => loadPosts(1)}
          />
          {searchText.length > 0 && (
            <AnimatedButton onPress={() => { setSearchText(''); loadPosts(1); }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
            </AnimatedButton>
          )}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          <AnimatedButton
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Todos
            </Text>
          </AnimatedButton>
          <AnimatedButton
            style={[styles.filterButton, filter === 'CLINICAL_CASE' && styles.filterButtonActive]}
            onPress={() => setFilter('CLINICAL_CASE')}
          >
            <Text style={[styles.filterText, filter === 'CLINICAL_CASE' && styles.filterTextActive]}>
              Casos
            </Text>
          </AnimatedButton>
          <AnimatedButton
            style={[styles.filterButton, filter === 'FORUM_DISCUSSION' && styles.filterButtonActive]}
            onPress={() => setFilter('FORUM_DISCUSSION')}
          >
            <Text style={[styles.filterText, filter === 'FORUM_DISCUSSION' && styles.filterTextActive]}>
              Discusiones
            </Text>
          </AnimatedButton>
          <AnimatedButton
            style={[styles.filterButton, filter === 'ARTICLE' && styles.filterButtonActive]}
            onPress={() => setFilter('ARTICLE')}
          >
            <Text style={[styles.filterText, filter === 'ARTICLE' && styles.filterTextActive]}>
              Artículos
            </Text>
          </AnimatedButton>
        </ScrollView>

        {/* Posts List */}
        {posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay posts aún</Text>
            <Text style={styles.emptySubtext}>
              {user?.role === 'VET' 
                ? 'Sé el primero en crear un post'
                : 'Los veterinarios pueden compartir casos clínicos y artículos'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.postsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onScrollEndDrag={() => {
              if (hasMore && !loading) {
                loadPosts(page + 1);
              }
            }}
          >
            {posts.map((post) => (
              <AnimatedCard
                key={post.id}
                style={styles.postCard}
                onPress={() => router.push(`/community/post-detail?id=${post.id}`)}
              >
                <View style={styles.postHeader}>
                  <View style={styles.postAuthor}>
                    {post.author?.user?.email ? (
                      <View style={styles.authorAvatar}>
                        <Text style={styles.authorAvatarText}>
                          {post.author.user.email.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                    <View>
                      <Text style={styles.authorName}>
                        {post.author?.fullName || 'Veterinario'}
                      </Text>
                      <Text style={styles.postDate}>
                        {new Date(post.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.postTypeBadge,
                      { backgroundColor: getPostTypeColor(post.type) },
                    ]}
                  >
                    <Text style={styles.postTypeText}>
                      {getPostTypeIcon(post.type)} {POST_TYPES[post.type]}
                    </Text>
                  </View>
                </View>

                <Text style={styles.postTitle}>{post.title}</Text>

                {post.type === 'FORUM_DISCUSSION' && post.forumDetails && (
                  <Text style={styles.postPreview} numberOfLines={2}>
                    {post.forumDetails.description}
                  </Text>
                )}

                {post.type === 'ARTICLE' && post.articleDetails && (
                  <Text style={styles.postPreview} numberOfLines={2}>
                    {post.articleDetails.content}
                  </Text>
                )}

                {post.type === 'CLINICAL_CASE' && post.clinicalCaseDetails && (
                  <View style={styles.clinicalCasePreview}>
                    <Text style={styles.clinicalCaseLabel}>Especie:</Text>
                    <Text style={styles.clinicalCaseValue}>
                      {post.clinicalCaseDetails.species}
                    </Text>
                  </View>
                )}

                {post.tags && post.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {post.tags.slice(0, 3).map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.postFooter}>
                  <AnimatedButton
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleLike(post.id);
                    }}
                  >
                    <Ionicons
                      name={post.liked ? 'heart' : 'heart-outline'}
                      size={20}
                      color={post.liked ? '#E91E63' : COLORS.textSecondary}
                    />
                    <Text style={styles.actionCount}>
                      {post._count?.likes || 0}
                    </Text>
                  </AnimatedButton>

                  <AnimatedButton
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/community/post-detail?id=${post.id}`);
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.actionCount}>
                      {post._count?.comments || 0}
                    </Text>
                  </AnimatedButton>

                  <AnimatedButton
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleFavorite(post.id);
                    }}
                  >
                    <Ionicons
                      name={post.favorited ? 'bookmark' : 'bookmark-outline'}
                      size={20}
                      color={post.favorited ? COLORS.accentOrange : COLORS.textSecondary}
                    />
                  </AnimatedButton>
                </View>
              </AnimatedCard>
            ))}

            {hasMore && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#8B7FA8" />
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  createButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textWhite,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    margin: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
  },
  filters: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.backgroundTertiary,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 28,
    maxHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  postsList: {
    flex: 1,
    padding: SPACING.lg,
    paddingBottom: 100, // Espacio para el tabBar
  },
  postCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    ...SHADOWS.sm,
  },
  authorAvatarText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textWhite,
  },
  authorName: {
    ...TYPOGRAPHY.bodyBold,
  },
  postDate: {
    ...TYPOGRAPHY.small,
    marginTop: SPACING.xs / 2,
  },
  postTypeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  postTypeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  postTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.sm,
  },
  postPreview: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  clinicalCasePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  clinicalCaseLabel: {
    ...TYPOGRAPHY.captionBold,
    marginRight: SPACING.xs,
  },
  clinicalCaseValue: {
    ...TYPOGRAPHY.caption,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  tagText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '500',
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionCount: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.huge,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },
  loadMoreContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
});
