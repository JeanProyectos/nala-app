import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import * as api from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';

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
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                Alert.alert('Próximamente', 'La funcionalidad de crear posts estará disponible pronto');
              }}
            >
              <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Crear</Text>
            </TouchableOpacity>
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
            <TouchableOpacity onPress={() => { setSearchText(''); loadPosts(1); }}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'CLINICAL_CASE' && styles.filterButtonActive]}
            onPress={() => setFilter('CLINICAL_CASE')}
          >
            <Text style={[styles.filterText, filter === 'CLINICAL_CASE' && styles.filterTextActive]}>
              🏥 Casos Clínicos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'FORUM_DISCUSSION' && styles.filterButtonActive]}
            onPress={() => setFilter('FORUM_DISCUSSION')}
          >
            <Text style={[styles.filterText, filter === 'FORUM_DISCUSSION' && styles.filterTextActive]}>
              💬 Discusiones
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'ARTICLE' && styles.filterButtonActive]}
            onPress={() => setFilter('ARTICLE')}
          >
            <Text style={[styles.filterText, filter === 'ARTICLE' && styles.filterTextActive]}>
              📄 Artículos
            </Text>
          </TouchableOpacity>
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
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                onPress={() => {
                  Alert.alert('Próximamente', 'La vista detallada de posts estará disponible pronto');
                }}
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
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleLike(post.id);
                    }}
                  >
                    <Ionicons
                      name={post.liked ? 'heart' : 'heart-outline'}
                      size={20}
                      color={post.liked ? '#E91E63' : '#666'}
                    />
                    <Text style={styles.actionCount}>
                      {post._count?.likes || 0}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/community/post?id=${post.id}`);
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color="#666" />
                    <Text style={styles.actionCount}>
                      {post._count?.comments || 0}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleFavorite(post.id);
                    }}
                  >
                    <Ionicons
                      name={post.favorited ? 'bookmark' : 'bookmark-outline'}
                      size={20}
                      color={post.favorited ? '#FF9800' : '#666'}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B7FA8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filters: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#8B7FA8',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#8B7FA8',
    fontWeight: '600',
  },
  postsList: {
    flex: 1,
    padding: 16,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B7FA8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  authorAvatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  postDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  postTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  postTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  postPreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  clinicalCasePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clinicalCaseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 6,
  },
  clinicalCaseValue: {
    fontSize: 14,
    color: '#333',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  tag: {
    backgroundColor: '#F0E6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#8B7FA8',
    fontWeight: '500',
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
});
