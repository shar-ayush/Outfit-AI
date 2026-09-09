import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import Screen from '@/components/common/Screen';

import Text from '@/components/common/Text';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useImagePicker } from '@/hooks/useImagePicker';
import { usePerformTryOn, useTryOnHistory, useDeleteTryOn } from '@/hooks/useTryOn';
import { useWardrobeList, useClothItem } from '@/hooks/useWardrobe';
import { useUIStore } from '@/stores';
import { colors, spacing, radius } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PRESET_PROMPTS = [
  'Studio lighting',
  'Urban street background',
  'Golden hour lighting',
  'Minimalist interior',
];

const PROCESSING_STEPS = [
  'Detecting person pose & proportions...',
  'Aligning garment to body contours...',
  'Synthesizing realistic fabric folds...',
  'Blending lighting and shadows...',
  'Finalizing high-res image...',
];

export default function VirtualTryOnModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const preselectedClothId = params?.clothId;

  const showToast = useUIStore((s) => s.showToast);
  const { pickFromCamera, pickFromGallery } = useImagePicker();

  const [activeTab, setActiveTab] = useState('studio');

  const [personAsset, setPersonAsset] = useState(null);
  const [apparelMode, setApparelMode] = useState('wardrobe');
  const [selectedClothId, setSelectedClothId] = useState(preselectedClothId || null);
  const [apparelAsset, setApparelAsset] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  const [generationResult, setGenerationResult] = useState(null);
  const [viewMode, setViewMode] = useState('result');
  const [processingStepIndex, setProcessingStepIndex] = useState(0);

  const performTryOn = usePerformTryOn();
  const { data: preselectedCloth } = useClothItem(preselectedClothId);
  const { data: wardrobeData, isLoading: isLoadingWardrobe } = useWardrobeList({ limit: 40 });
  const { data: historyData, isLoading: isLoadingHistory } = useTryOnHistory(1, 30);
  const deleteTryOn = useDeleteTryOn();

  useEffect(() => {
    if (preselectedClothId) {
      setSelectedClothId(preselectedClothId);
      setApparelMode('wardrobe');
    }
  }, [preselectedClothId]);

  useEffect(() => {
    let interval;
    if (performTryOn.isPending) {
      setProcessingStepIndex(0);
      interval = setInterval(() => {
        setProcessingStepIndex((prev) => (prev + 1) % PROCESSING_STEPS.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [performTryOn.isPending]);

  const handlePickPerson = async (source) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const asset = source === 'camera' ? await pickFromCamera() : await pickFromGallery();
    if (asset) {
      setPersonAsset(asset);
    }
  };

  const handlePickApparel = async (source) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const asset = source === 'camera' ? await pickFromCamera() : await pickFromGallery();
    if (asset) {
      setApparelAsset(asset);
      setSelectedClothId(null);
    }
  };

  const handleGenerate = () => {
    if (!personAsset) {
      showToast('Please select or take a photo of yourself', 'warning');
      return;
    }

    if (apparelMode === 'wardrobe' && !selectedClothId) {
      showToast('Please select a clothing item from your wardrobe', 'warning');
      return;
    }

    if (apparelMode === 'upload' && !apparelAsset) {
      showToast('Please upload a garment image', 'warning');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    performTryOn.mutate(
      {
        personAsset,
        clothId: apparelMode === 'wardrobe' ? selectedClothId : undefined,
        apparelAsset: apparelMode === 'upload' ? apparelAsset : undefined,
        prompt: prompt.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setGenerationResult(data);
          setViewMode('result');
          showToast('Try-on generated successfully!', 'success');
        },
        onError: (err) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          const errorMsg =
            err.response?.data?.message || err.message || 'Virtual try-on generation failed';
          showToast(errorMsg, 'error');
        },
      }
    );
  };

  const handleShare = async () => {
    if (!generationResult?.resultImageUrl) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const filename = `try_on_${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      const downloaded = await FileSystem.downloadAsync(generationResult.resultImageUrl, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloaded.uri);
      } else {
        showToast('Sharing is not supported on this device', 'warning');
      }
    } catch {
      showToast('Could not share image', 'error');
    }
  };

  const handleDeleteHistory = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteTryOn.mutate(id, {
      onSuccess: () => {
        showToast('Saved look deleted', 'success');
      },
      onError: () => {
        showToast('Could not delete look', 'error');
      },
    });
  };

  const allClothes =
    wardrobeData?.pages?.flatMap((p) => p.clothes) ||
    wardrobeData?.clothes ||
    [];

  const tryOnCompatibleClothes = allClothes.filter((c) =>
    ['top', 'bottom', 'outerwear', 'full_body'].includes(c.category)
  );

  const selectedCloth =
    allClothes.find((c) => c._id === selectedClothId) ||
    (preselectedCloth?._id === selectedClothId ? preselectedCloth : null);

  return (
    <Screen edges={['top', 'bottom']} padded={false} backgroundColor={colors.surface}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerIconButton}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Close Try-On"
        >
          <MaterialCommunityIcons name="close" size={22} color={colors.onSurface} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text variant="headlineSm" style={styles.headerTitle}>
            Virtual Try-On
          </Text>
          <View style={styles.aiBadge}>
            <MaterialCommunityIcons name="creation" size={12} color={colors.goldAccent} />
            <Text variant="labelCaps" style={styles.aiBadgeText}>
              AI POWERED
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.headerIconButton, activeTab === 'history' && styles.headerIconButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab((t) => (t === 'studio' ? 'history' : 'studio'));
          }}
          hitSlop={8}
          accessibilityLabel="View history"
        >
          <MaterialCommunityIcons
            name={activeTab === 'history' ? 'hanger' : 'history'}
            size={22}
            color={activeTab === 'history' ? colors.goldAccent : colors.onSurface}
          />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, activeTab === 'studio' && styles.tabButtonActive]}
          onPress={() => setActiveTab('studio')}
        >
          <Text
            variant="bodyMd"
            color={activeTab === 'studio' ? 'onPrimary' : 'secondary'}
            style={activeTab === 'studio' ? styles.tabTextActive : null}
          >
            Try-On Studio
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            variant="bodyMd"
            color={activeTab === 'history' ? 'onPrimary' : 'secondary'}
            style={activeTab === 'history' ? styles.tabTextActive : null}
          >
            Saved Looks ({historyData?.results?.length || 0})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'history' ? (
        <ScrollView style={styles.flex} contentContainerStyle={styles.historyContainer}>
          {isLoadingHistory ? (
            <LoadingSpinner />
          ) : !historyData?.results || historyData.results.length === 0 ? (
            <View style={styles.emptyHistory}>
              <MaterialCommunityIcons name="image-multiple-outline" size={48} color={colors.outlineVariant} />
              <Text variant="headlineSm" style={styles.emptyTitle}>
                No saved try-on looks yet
              </Text>
              <Text variant="bodyMd" color="secondary" style={styles.emptySubtitle}>
                Create your first virtual try-on in the studio above!
              </Text>
              <Button
                variant="primary"
                fullWidth={false}
                onPress={() => setActiveTab('studio')}
                style={styles.emptyButton}
              >
                Go to Studio
              </Button>
            </View>
          ) : (
            <View style={styles.historyGrid}>
              {historyData.results.map((item) => (
                <View key={item._id} style={styles.historyCard}>
                  <Image source={{ uri: item.resultImageUrl }} style={styles.historyImage} contentFit="cover" />
                  <View style={styles.historyMeta}>
                    <Text variant="bodySm" style={styles.historyDate}>
                      {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                    <View style={styles.historyActions}>
                      <Pressable
                        onPress={() => {
                          setGenerationResult(item);
                          setActiveTab('studio');
                        }}
                        style={styles.historyActionBtn}
                      >
                        <MaterialCommunityIcons name="eye-outline" size={18} color={colors.primary} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteHistory(item._id)}
                        style={styles.historyActionBtn}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error || '#D32F2F'} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : generationResult && !performTryOn.isPending ? (
        <ScrollView style={styles.flex} contentContainerStyle={styles.resultContainer}>
          <View style={styles.resultCard}>
            <Image
              source={{
                uri:
                  viewMode === 'result'
                    ? generationResult.resultImageUrl
                    : generationResult.personImageUrl,
              }}
              style={styles.resultImage}
              contentFit="cover"
            />

            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.togglePill, viewMode === 'result' && styles.togglePillActive]}
                onPress={() => setViewMode('result')}
              >
                <Text
                  variant="labelCaps"
                  color={viewMode === 'result' ? 'onPrimary' : 'secondary'}
                >
                  AI Result
                </Text>
              </Pressable>
              <Pressable
                style={[styles.togglePill, viewMode === 'original' && styles.togglePillActive]}
                onPress={() => setViewMode('original')}
              >
                <Text
                  variant="labelCaps"
                  color={viewMode === 'original' ? 'onPrimary' : 'secondary'}
                >
                  Original Photo
                </Text>
              </Pressable>
            </View>
          </View>

          {generationResult.apparelImageUrl && (
            <View style={styles.fittedGarmentRow}>
              <Image
                source={{ uri: generationResult.apparelImageUrl }}
                style={styles.fittedGarmentThumb}
                contentFit="cover"
              />
              <View style={styles.fittedGarmentInfo}>
                <Text variant="labelCaps" color="secondary">
                  FITTED APPAREL
                </Text>
                <Text variant="bodyMd" numberOfLines={1}>
                  {generationResult.clothId?.name ||
                    generationResult.clothId?.category ||
                    'Custom Garment'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.resultActions}>
            <Button
              variant="secondary"
              fullWidth={false}
              icon="share-variant-outline"
              onPress={handleShare}
              style={styles.resultActionBtn}
            >
              Share Look
            </Button>
            <Button
              variant="primary"
              fullWidth={false}
              icon="creation"
              onPress={() => {
                setGenerationResult(null);
                setApparelAsset(null);
              }}
              style={styles.resultActionBtn}
            >
              Try Another
            </Button>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.flex} contentContainerStyle={styles.studioContainer} showsVerticalScrollIndicator={false}>
          {performTryOn.isPending ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingPulseCard}>
                <ActivityIndicator size="large" color={colors.goldAccent} />
                <Text variant="headlineSm" style={styles.loadingTitle}>
                  Synthesizing Your Fit
                </Text>
                <Text variant="bodyMd" color="secondary" style={styles.loadingStepText}>
                  {PROCESSING_STEPS[processingStepIndex]}
                </Text>
                <View style={styles.progressBarWrap}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${((processingStepIndex + 1) / PROCESSING_STEPS.length) * 100}%` },
                    ]}
                  />
                </View>
                <Text variant="bodySm" color="secondary" style={styles.loadingHint}>
                  Deep learning virtual try-on typically takes 15–20 seconds.
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.stepNumberWrap}>
                    <Text variant="labelCaps" style={styles.stepNumber}>
                      1
                    </Text>
                  </View>
                  <Text variant="headlineSm" style={styles.sectionTitle}>
                    Your Photo
                  </Text>
                  <Text variant="bodySm" color="secondary" style={styles.sectionSubtitle}>
                    (Full or upper body)
                  </Text>
                </View>

                {personAsset ? (
                  <View style={styles.photoPreviewCard}>
                    <Image source={{ uri: personAsset.uri }} style={styles.personPreviewImage} contentFit="cover" />
                    <View style={styles.photoOverlayBadge}>
                      <MaterialCommunityIcons name="check-circle" size={20} color={colors.goldAccent} />
                      <Text variant="bodySm" style={styles.photoOverlayText}>
                        Photo Selected
                      </Text>
                    </View>
                    <View style={styles.photoActionRow}>
                      <Pressable
                        style={styles.changePhotoBtn}
                        onPress={() => handlePickPerson('camera')}
                      >
                        <MaterialCommunityIcons name="camera-outline" size={16} color={colors.onSurface} />
                        <Text variant="bodySm" style={styles.btnLabel}>Camera</Text>
                      </Pressable>
                      <Pressable
                        style={styles.changePhotoBtn}
                        onPress={() => handlePickPerson('gallery')}
                      >
                        <MaterialCommunityIcons name="image-outline" size={16} color={colors.onSurface} />
                        <Text variant="bodySm" style={styles.btnLabel}>Gallery</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholderCard}>
                    <MaterialCommunityIcons name="account-outline" size={44} color={colors.outlineVariant} />
                    <Text variant="bodyMd" style={styles.uploadPlaceholderText}>
                      Upload a photo of yourself
                    </Text>
                    <Text variant="bodySm" color="secondary" style={styles.uploadPlaceholderHint}>
                      Standing pose with good lighting works best
                    </Text>
                    <View style={styles.pickerButtonsRow}>
                      <Button
                        variant="secondary"
                        icon="camera"
                        size="md"
                        fullWidth={false}
                        onPress={() => handlePickPerson('camera')}
                        style={styles.pickerBtn}
                      >
                        Camera
                      </Button>
                      <Button
                        variant="secondary"
                        icon="image-outline"
                        size="md"
                        fullWidth={false}
                        onPress={() => handlePickPerson('gallery')}
                        style={styles.pickerBtn}
                      >
                        Gallery
                      </Button>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.stepNumberWrap}>
                    <Text variant="labelCaps" style={styles.stepNumber}>
                      2
                    </Text>
                  </View>
                  <Text variant="headlineSm" style={styles.sectionTitle}>
                    Select Apparel
                  </Text>
                </View>

                <View style={styles.modeSwitchRow}>
                  <Pressable
                    style={[
                      styles.modeSwitchBtn,
                      apparelMode === 'wardrobe' && styles.modeSwitchBtnActive,
                    ]}
                    onPress={() => setApparelMode('wardrobe')}
                  >
                    <MaterialCommunityIcons
                      name="hanger"
                      size={18}
                      color={apparelMode === 'wardrobe' ? colors.onPrimary : colors.secondary}
                    />
                    <Text
                      variant="bodySm"
                      color={apparelMode === 'wardrobe' ? 'onPrimary' : 'secondary'}
                    >
                      From Wardrobe
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.modeSwitchBtn,
                      apparelMode === 'upload' && styles.modeSwitchBtnActive,
                    ]}
                    onPress={() => setApparelMode('upload')}
                  >
                    <MaterialCommunityIcons
                      name="camera-plus-outline"
                      size={18}
                      color={apparelMode === 'upload' ? colors.onPrimary : colors.secondary}
                    />
                    <Text
                      variant="bodySm"
                      color={apparelMode === 'upload' ? 'onPrimary' : 'secondary'}
                    >
                      Upload Garment
                    </Text>
                  </Pressable>
                </View>

                {apparelMode === 'wardrobe' ? (
                  <View style={styles.wardrobePickerSection}>
                    {selectedCloth && (
                      <View style={styles.selectedClothBanner}>
                        <Image
                          source={{ uri: selectedCloth.imageUrl }}
                          style={styles.selectedClothThumb}
                          contentFit="cover"
                        />
                        <View style={styles.selectedClothMeta}>
                          <Text variant="labelCaps" color="secondary">
                            SELECTED ITEM
                          </Text>
                          <Text variant="bodyMd" numberOfLines={1} style={styles.selectedClothName}>
                            {selectedCloth.name || `${selectedCloth.subCategory || selectedCloth.category}`}
                          </Text>
                          <Text variant="bodySm" color="secondary">
                            {selectedCloth.category} • {selectedCloth.color?.primary || 'Solid'}
                          </Text>
                        </View>
                        <MaterialCommunityIcons name="check-circle" size={24} color={colors.goldAccent} />
                      </View>
                    )}

                    <Text variant="bodySm" color="secondary" style={styles.pickerInstructions}>
                      Tap any clothing item below to try it on:
                    </Text>

                    {isLoadingWardrobe ? (
                      <LoadingSpinner />
                    ) : tryOnCompatibleClothes.length === 0 ? (
                      <View style={styles.emptyWardrobeAlert}>
                        <Text variant="bodySm" color="secondary">
                          No tops or dresses found in your wardrobe. Upload one to try on!
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalWardrobeList}
                      >
                        {tryOnCompatibleClothes.map((cloth) => {
                          const isSelected = selectedClothId === cloth._id;
                          return (
                            <Pressable
                              key={cloth._id}
                              style={[
                                styles.wardrobeThumbCard,
                                isSelected && styles.wardrobeThumbCardSelected,
                              ]}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedClothId(cloth._id);
                              }}
                            >
                              <Image source={{ uri: cloth.imageUrl }} style={styles.wardrobeThumbImage} contentFit="cover" />
                              {isSelected && (
                                <View style={styles.thumbSelectedBadge}>
                                  <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
                                </View>
                              )}
                              <Text variant="bodySm" numberOfLines={1} style={styles.thumbLabel}>
                                {cloth.name || cloth.subCategory || cloth.category}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                ) : (
                  <View>
                    {apparelAsset ? (
                      <View style={styles.photoPreviewCard}>
                        <Image source={{ uri: apparelAsset.uri }} style={styles.personPreviewImage} contentFit="cover" />
                        <View style={styles.photoOverlayBadge}>
                          <MaterialCommunityIcons name="check-circle" size={20} color={colors.goldAccent} />
                          <Text variant="bodySm" style={styles.photoOverlayText}>
                            Garment Selected
                          </Text>
                        </View>
                        <View style={styles.photoActionRow}>
                          <Pressable
                            style={styles.changePhotoBtn}
                            onPress={() => handlePickApparel('camera')}
                          >
                            <MaterialCommunityIcons name="camera-outline" size={16} color={colors.onSurface} />
                            <Text variant="bodySm" style={styles.btnLabel}>Camera</Text>
                          </Pressable>
                          <Pressable
                            style={styles.changePhotoBtn}
                            onPress={() => handlePickApparel('gallery')}
                          >
                            <MaterialCommunityIcons name="image-outline" size={16} color={colors.onSurface} />
                            <Text variant="bodySm" style={styles.btnLabel}>Gallery</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.uploadPlaceholderCard}>
                        <MaterialCommunityIcons name="tshirt-crew-outline" size={44} color={colors.outlineVariant} />
                        <Text variant="bodyMd" style={styles.uploadPlaceholderText}>
                          Take or choose a garment photo
                        </Text>
                        <Text variant="bodySm" color="secondary" style={styles.uploadPlaceholderHint}>
                          Front view of shirt, jacket, or dress on flat background
                        </Text>
                        <View style={styles.pickerButtonsRow}>
                          <Button
                            variant="secondary"
                            icon="camera"
                            size="md"
                            fullWidth={false}
                            onPress={() => handlePickApparel('camera')}
                            style={styles.pickerBtn}
                          >
                            Camera
                          </Button>
                          <Button
                            variant="secondary"
                            icon="image-outline"
                            size="md"
                            fullWidth={false}
                            onPress={() => handlePickApparel('gallery')}
                            style={styles.pickerBtn}
                          >
                            Gallery
                          </Button>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Pressable
                  style={styles.accordionHeader}
                  onPress={() => setShowPromptInput((v) => !v)}
                >
                  <View style={styles.accordionTitleRow}>
                    <MaterialCommunityIcons name="tune-variant" size={18} color={colors.secondary} />
                    <Text variant="bodyMd" style={styles.accordionTitle}>
                      Style & Environment Prompt (Optional)
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={showPromptInput ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.secondary}
                  />
                </Pressable>

                {showPromptInput && (
                  <View style={styles.promptWrap}>
                    <TextInput
                      style={styles.promptInput}
                      placeholder="e.g. Warm sunset lighting, modern studio background..."
                      placeholderTextColor={colors.outline}
                      value={prompt}
                      onChangeText={setPrompt}
                      multiline
                    />
                    <View style={styles.presetChipsRow}>
                      {PRESET_PROMPTS.map((p) => (
                        <Pressable
                          key={p}
                          style={[styles.presetChip, prompt === p && styles.presetChipActive]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setPrompt(prompt === p ? '' : p);
                          }}
                        >
                          <Text
                            variant="bodySm"
                            color={prompt === p ? 'onPrimary' : 'secondary'}
                          >
                            {p}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.ctaWrap}>
                <Button
                  variant="primary"
                  icon="creation"
                  size="lg"
                  onPress={handleGenerate}
                  loading={performTryOn.isPending}
                  disabled={
                    !personAsset ||
                    (apparelMode === 'wardrobe' && !selectedClothId) ||
                    (apparelMode === 'upload' && !apparelAsset)
                  }
                  fullWidth
                >
                  Generate Virtual Try-On
                </Button>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surface,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.circle,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButtonActive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  aiBadgeText: {
    color: colors.goldAccent,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackSm,
    gap: spacing.inlineSm,
    backgroundColor: colors.surface,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLow,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabTextActive: {
    fontFamily: 'Inter_600SemiBold',
  },
  studioContainer: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.stackXl * 2,
  },
  section: {
    marginTop: spacing.stackMd,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.stackSm,
  },
  stepNumberWrap: {
    width: 22,
    height: 22,
    borderRadius: radius.circle,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionSubtitle: {
    marginLeft: 6,
  },
  uploadPlaceholderCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: spacing.stackLg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholderText: {
    marginTop: 8,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  uploadPlaceholderHint: {
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 14,
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  pickerBtn: {
    flex: 1,
    maxWidth: 140,
  },
  photoPreviewCard: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  personPreviewImage: {
    width: '100%',
    height: 220,
  },
  photoOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  photoOverlayText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
  },
  photoActionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
  },
  changePhotoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainerLowest,
  },
  btnLabel: {
    fontFamily: 'Inter_500Medium',
  },
  modeSwitchRow: {
    flexDirection: 'row',
    gap: spacing.inlineSm,
    marginBottom: spacing.stackSm,
  },
  modeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  modeSwitchBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  wardrobePickerSection: {
    marginTop: 4,
  },
  selectedClothBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1.5,
    borderColor: colors.goldAccent,
    marginBottom: 10,
  },
  selectedClothThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
  },
  selectedClothMeta: {
    flex: 1,
    marginLeft: 12,
  },
  selectedClothName: {
    fontFamily: 'Inter_600SemiBold',
  },
  pickerInstructions: {
    marginBottom: 8,
  },
  horizontalWardrobeList: {
    gap: 12,
    paddingVertical: 4,
  },
  wardrobeThumbCard: {
    width: 88,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLowest,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  wardrobeThumbCardSelected: {
    borderColor: colors.goldAccent,
    borderWidth: 2,
  },
  wardrobeThumbImage: {
    width: 76,
    height: 76,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceContainer,
  },
  thumbSelectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: radius.circle,
    backgroundColor: colors.goldAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLabel: {
    marginTop: 4,
    fontSize: 11,
    textAlign: 'center',
  },
  emptyWardrobeAlert: {
    padding: spacing.stackMd,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  accordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionTitle: {
    fontFamily: 'Inter_500Medium',
  },
  promptWrap: {
    marginTop: 8,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  promptInput: {
    minHeight: 56,
    textAlignVertical: 'top',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurface,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
  },
  ctaWrap: {
    marginTop: spacing.stackLg,
    marginBottom: spacing.stackXl,
  },
  loadingContainer: {
    paddingVertical: spacing.stackXl * 1.5,
    alignItems: 'center',
  },
  loadingPulseCard: {
    width: '100%',
    padding: spacing.stackXl,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    alignItems: 'center',
  },
  loadingTitle: {
    marginTop: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  loadingStepText: {
    marginTop: 8,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  progressBarWrap: {
    width: '100%',
    height: 4,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.goldAccent,
    borderRadius: radius.full,
  },
  loadingHint: {
    marginTop: 14,
    textAlign: 'center',
  },
  resultContainer: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.stackXl * 2,
  },
  resultCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  resultImage: {
    width: '100%',
    height: SCREEN_WIDTH * 1.25,
  },
  toggleRow: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.full,
    padding: 3,
  },
  togglePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  togglePillActive: {
    backgroundColor: colors.primary,
  },
  fittedGarmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  fittedGarmentThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceContainer,
  },
  fittedGarmentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.inlineMd,
    marginTop: spacing.stackLg,
  },
  resultActionBtn: {
    flex: 1,
  },
  historyContainer: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.stackXl,
  },
  emptyHistory: {
    paddingVertical: spacing.stackXl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  emptySubtitle: {
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 240,
  },
  emptyButton: {
    marginTop: 20,
    minWidth: 160,
  },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.stackSm,
  },
  historyCard: {
    width: (SCREEN_WIDTH - spacing.gutter * 2 - 12) / 2,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  historyImage: {
    width: '100%',
    height: 180,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  historyDate: {
    color: colors.secondary,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  historyActionBtn: {
    padding: 4,
  },
});
