import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import * as api from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '../../../components/AnimatedButton';
import AnimatedCard from '../../../components/AnimatedCard';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, INPUT_STYLES, BUTTON_STYLES } from '../../../styles/theme';

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const postData = await api.getCommunityPost(parseInt(id));
      setPost(postData);
      setLiked(postData.liked || false);
      setFavorited(postData.favorited || false);
      setComments(postData.comments || []);
    } catch (error) {
      console.error('Error cargando post:', error);
      Alert.alert('Error', 'No se pudo cargar el post');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const result = await api.togglePostLike(parseInt(id));
      setLiked(result.liked);
      setPost({ ...post, _count: { ...post._count, likes: result.liked ? post._count.likes + 1 : post._count.likes - 1 } });
    } catch (error) {
      console.error('Error al dar like:', error);
      Alert.alert('Error', 'No se pudo actualizar el like');
    }
  };

  const handleFavorite = async () => {
    try {
      const result = await api.togglePostFavorite(parseInt(id));
      setFavorited(result.favorited);
    } catch (error) {
      console.error('Error al guardar favorito:', error);
      Alert.alert('Error', 'No se pudo actualizar el favorito');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'El comentario no puede estar vacío');
      return;
    }

    if (user?.role !== 'VET') {
      Alert.alert('Error', 'Solo los veterinarios pueden comentar');
      return;
    }

    setSubmittingComment(true);
    try {
      const newComment = await api.createComment(parseInt(id), { content: commentText.trim() });
      setComments([...comments, newComment]);
      setCommentText('');
      setPost({ ...post, _count: { ...post._count, comments: post._count.comments + 1 } });
    } catch (error) {
      console.error('Error creando comentario:', error);
      Alert.alert('Error', error.message || 'No se pudo crear el comentario');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleMarkHelpful = async (commentId) => {
    try {
      await api.markCommentAsHelpful(commentId);
      setComments(comments.map(c => 
        c.id === commentId 
          ? { ...c, helpful: !c.helpful, _count: { ...c._count, helpful: c.helpful ? c._count.helpful - 1 : c._count.helpful + 1 } }
          : c
      ));
    } catch (error) {
      console.error('Error marcando comentario:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Post no encontrado</Text>
      </View>
    );
  }

  const getPostTypeIcon = (type) => {
    switch (type) {
      case 'CLINICAL_CASE': return '🏥';
      case 'FORUM_DISCUSSION': return '💬';
      case 'ARTICLE': return '📄';
      default: return '📝';
    }
  };

  const getPostTypeColor = (type) => {
    switch (type) {
      case 'CLINICAL_CASE': return COLORS.accentGreen;
      case 'FORUM_DISCUSSION': return COLORS.accentBlue;
      case 'ARTICLE': return COLORS.accentOrange;
      default: return COLORS.textTertiary;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Post Principal */}
      <AnimatedCard style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postAuthor}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>
                {post.author?.user?.email?.charAt(0).toUpperCase() || 'V'}
              </Text>
            </View>
            <View>
              <Text style={styles.authorName}>
                {post.author?.fullName || 'Veterinario'}
              </Text>
              <Text style={styles.postDate}>
                {new Date(post.createdAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
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
              {getPostTypeIcon(post.type)} {post.type.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.postTitle}>{post.title}</Text>

        {/* Contenido según tipo */}
        {post.type === 'CLINICAL_CASE' && post.clinicalCaseDetails && (
          <View style={styles.clinicalCaseContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Especie:</Text>
              <Text style={styles.detailValue}>{post.clinicalCaseDetails.species}</Text>
            </View>
            {post.clinicalCaseDetails.age && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Edad:</Text>
                <Text style={styles.detailValue}>{post.clinicalCaseDetails.age}</Text>
              </View>
            )}
            {post.clinicalCaseDetails.weight && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Peso:</Text>
                <Text style={styles.detailValue}>{post.clinicalCaseDetails.weight} kg</Text>
              </View>
            )}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Síntomas</Text>
              <Text style={styles.sectionContent}>{post.clinicalCaseDetails.symptoms}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Diagnóstico</Text>
              <Text style={styles.sectionContent}>{post.clinicalCaseDetails.diagnosis}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tratamiento</Text>
              <Text style={styles.sectionContent}>{post.clinicalCaseDetails.treatment}</Text>
            </View>
            {post.clinicalCaseDetails.evolution && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Evolución</Text>
                <Text style={styles.sectionContent}>{post.clinicalCaseDetails.evolution}</Text>
              </View>
            )}
          </View>
        )}

        {post.type === 'FORUM_DISCUSSION' && post.forumDetails && (
          <Text style={styles.postContent}>{post.forumDetails.description}</Text>
        )}

        {post.type === 'ARTICLE' && post.articleDetails && (
          <Text style={styles.postContent}>{post.articleDetails.content}</Text>
        )}

        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.postActions}>
          <AnimatedButton style={styles.actionButton} onPress={handleLike}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={24}
              color={liked ? '#E91E63' : COLORS.textSecondary}
            />
            <Text style={styles.actionCount}>{post._count?.likes || 0}</Text>
          </AnimatedButton>

          <AnimatedButton style={styles.actionButton} onPress={handleFavorite}>
            <Ionicons
              name={favorited ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={favorited ? COLORS.accentOrange : COLORS.textSecondary}
            />
          </AnimatedButton>
        </View>
      </AnimatedCard>

      {/* Comentarios */}
      <View style={styles.commentsSection}>
        <Text style={styles.commentsTitle}>
          Comentarios ({post._count?.comments || 0})
        </Text>

        {/* Formulario de comentario (solo VET) */}
        {user?.role === 'VET' && (
          <AnimatedCard style={styles.commentForm}>
            <TextInput
              style={[styles.commentInput, styles.textArea]}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Escribe un comentario..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={4}
            />
            <AnimatedButton
              style={[styles.submitCommentButton, submittingComment && styles.buttonDisabled]}
              onPress={handleSubmitComment}
              disabled={submittingComment || !commentText.trim()}
            >
              {submittingComment ? (
                <ActivityIndicator color={COLORS.textWhite} />
              ) : (
                <Text style={styles.submitCommentText}>Comentar</Text>
              )}
            </AnimatedButton>
          </AnimatedCard>
        )}

        {/* Lista de comentarios */}
        {comments.length === 0 ? (
          <AnimatedCard style={styles.emptyComments}>
            <Text style={styles.emptyCommentsText}>
              {user?.role === 'VET' ? 'Sé el primero en comentar' : 'Aún no hay comentarios'}
            </Text>
          </AnimatedCard>
        ) : (
          comments.map((comment) => (
            <AnimatedCard key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAuthor}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {comment.author?.user?.email?.charAt(0).toUpperCase() || 'V'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.commentAuthorName}>
                      {comment.author?.fullName || 'Veterinario'}
                    </Text>
                    <Text style={styles.commentDate}>
                      {new Date(comment.createdAt).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                </View>
                {user?.role === 'VET' && (
                  <AnimatedButton
                    style={styles.helpfulButton}
                    onPress={() => handleMarkHelpful(comment.id)}
                  >
                    <Ionicons
                      name={comment.helpful ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={20}
                      color={comment.helpful ? COLORS.accentGreen : COLORS.textSecondary}
                    />
                    <Text style={styles.helpfulText}>
                      Útil ({comment._count?.helpful || 0})
                    </Text>
                  </AnimatedButton>
                )}
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>
            </AnimatedCard>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  content: {
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.accentRed,
  },
  postCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    ...SHADOWS.sm,
  },
  authorAvatarText: {
    ...TYPOGRAPHY.h4,
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  postTypeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  postTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.lg,
  },
  postContent: {
    ...TYPOGRAPHY.body,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  clinicalCaseContent: {
    marginBottom: SPACING.lg,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    ...TYPOGRAPHY.bodyBold,
    marginRight: SPACING.sm,
  },
  detailValue: {
    ...TYPOGRAPHY.body,
  },
  section: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: BORDER_RADIUS.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.sm,
    color: COLORS.primary,
  },
  sectionContent: {
    ...TYPOGRAPHY.body,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  tag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  tagText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.lg,
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
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  commentsSection: {
    marginTop: SPACING.md,
  },
  commentsTitle: {
    ...TYPOGRAPHY.h4,
    marginBottom: SPACING.lg,
  },
  commentForm: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  commentInput: {
    ...INPUT_STYLES.default,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitCommentButton: {
    ...BUTTON_STYLES.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitCommentText: {
    ...TYPOGRAPHY.button,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyComments: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyCommentsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  commentCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  commentAvatarText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textWhite,
  },
  commentAuthorName: {
    ...TYPOGRAPHY.bodyBold,
  },
  commentDate: {
    ...TYPOGRAPHY.small,
    marginTop: SPACING.xs / 2,
  },
  commentContent: {
    ...TYPOGRAPHY.body,
    lineHeight: 22,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  helpfulText: {
    ...TYPOGRAPHY.small,
  },
});
