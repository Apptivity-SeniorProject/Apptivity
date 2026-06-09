import { Modal, Pressable, ScrollView, Text, View, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';

import { Button } from '@/src/components/ui/button';
import { cn } from '@/src/utils/cn';
import type { TagDto } from '@/src/types/lookup';
import type { ProfileDto } from '@/src/types/profile';
import { useUpdateProfile, useSetMyInterests, useUploadProfilePhoto } from '@/src/hooks/useProfile';
import { useToast } from '@/src/hooks/useToast';
import { getApiErrorMessage } from '@/src/utils/error';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  tags: TagDto[];
  profile?: ProfileDto | null;
}

export function EditProfileModal({
  visible,
  onClose,
  tags,
  profile,
}: EditProfileModalProps) {
  const toast = useToast();
  const updateProfileMutation = useUpdateProfile();
  const setInterestsMutation = useSetMyInterests();
  const uploadPhotoMutation = useUploadProfilePhoto();

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible && profile) {
      setName(profile.userProfile?.name ?? '');
      setSurname(profile.userProfile?.surname ?? '');
      setUsername(profile.username ?? '');
      setBio(profile.userProfile?.bio ?? '');
      setSelectedTagIds(profile.interests?.map((i) => i.id) ?? []);
    }
  }, [visible, profile]);

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  };

  const handleProfilePhotoPress = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      toast.error('Galeri erisimi reddedildi.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (pickerResult.canceled || !pickerResult.assets?.[0]) {
      return;
    }

    const asset = pickerResult.assets[0];
    const mimeType = asset.mimeType ?? (asset.uri.endsWith('.png') ? 'image/png' : 'image/jpeg');

    uploadPhotoMutation.mutate(
      { uri: asset.uri, mimeType },
      {
        onSuccess: () => {
          toast.success('Profil fotografi guncellendi.');
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Profil fotografi yuklenemedi.'));
        },
      }
    );
  };

  const handleSave = async () => {
    try {
      if (name !== profile?.userProfile?.name || surname !== profile?.userProfile?.surname || username !== profile?.username || bio !== profile?.userProfile?.bio) {
        await updateProfileMutation.mutateAsync({
          name: name.trim(),
          surname: surname.trim(),
          username: username.trim(),
          bio: bio.trim(),
        });
      }
      
      const currentTagIds = profile?.interests?.map(i => i.id).sort().join(',') ?? '';
      const newTagIds = [...selectedTagIds].sort().join(',');
      
      if (currentTagIds !== newTagIds) {
        await setInterestsMutation.mutateAsync(selectedTagIds);
      }
      
      toast.success('Profil güncellendi.');
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Güncelleme başarısız.'));
    }
  };

  const isSaving = updateProfileMutation.isPending || setInterestsMutation.isPending;
  const initials = profile ? (profile.userProfile?.name?.[0] || profile.username?.[0] || '?').toUpperCase() : '?';

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-end bg-black/35">
          <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-6 pt-5">
            <Text className="text-lg font-semibold text-slate-900 mb-4">Profili Duzenle</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-4">
              {/* Photo */}
              <View className="items-center mb-6">
                <Pressable 
                  onPress={handleProfilePhotoPress}
                  disabled={uploadPhotoMutation.isPending}
                  className="h-24 w-24 rounded-full bg-slate-100 border-2 border-slate-200 items-center justify-center overflow-hidden relative">
                  {profile?.profilePhoto ? (
                    <Image source={{ uri: profile.profilePhoto }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Text className="text-3xl font-semibold text-slate-400">{initials}</Text>
                  )}
                  
                  {uploadPhotoMutation.isPending && (
                    <View className="absolute inset-0 bg-black/40 items-center justify-center rounded-full">
                      <ActivityIndicator color="#fff" size="small" />
                    </View>
                  )}

                  {!uploadPhotoMutation.isPending && (
                    <View className="absolute bottom-0 w-full bg-black/40 py-1 items-center">
                      <Camera size={14} color="#fff" />
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Form Fields */}
              <View className="gap-3 mb-5">
                <View>
                  <Text className="text-xs font-medium text-slate-500 mb-1">Kullanici Adi</Text>
                  <TextInput
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900"
                    value={username}
                    onChangeText={setUsername}
                    placeholder="kullanici.adi"
                    autoCapitalize="none"
                  />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-slate-500 mb-1">Ad</Text>
                    <TextInput
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900"
                      value={name}
                      onChangeText={setName}
                      placeholder="Adınız"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-slate-500 mb-1">Soyad</Text>
                    <TextInput
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900"
                      value={surname}
                      onChangeText={setSurname}
                      placeholder="Soyadınız"
                    />
                  </View>
                </View>
                <View>
                  <Text className="text-xs font-medium text-slate-500 mb-1">Hakkında</Text>
                  <TextInput
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 min-h-[80px]"
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Kendinizden bahsedin..."
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <Text className="mb-2 text-sm font-medium text-slate-700">Ilgi Alanlari</Text>
              <Text className="mb-3 text-xs text-slate-500">
                Bu secimler Senin Icin onerilerini etkiler.
              </Text>
              <View className="flex-row flex-wrap gap-2 pb-2">
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <Pressable
                      key={tag.id}
                      className={cn(
                        'rounded-full border px-3 py-2',
                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-200 bg-slate-100'
                      )}
                      onPress={() => handleToggleTag(tag.id)}>
                      <Text
                        className={cn(
                          'text-xs font-semibold',
                          isSelected ? 'text-white' : 'text-slate-700'
                        )}>
                        {tag.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View className="mt-2 flex-row gap-3">
              <Button
                label="Iptal"
                variant="secondary"
                className="flex-1"
                disabled={isSaving}
                onPress={onClose}
              />
              <Button
                label="Kaydet"
                className="flex-1"
                isLoading={isSaving}
                onPress={handleSave}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
