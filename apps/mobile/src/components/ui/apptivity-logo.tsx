import { Image } from 'expo-image';
import { Text, View, Pressable, Modal, TouchableOpacity } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';

export function ApptivityLogo() {
  const [clickCount, setClickCount] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const lastClickTimeRef = useRef(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const handlePress = async () => {
    const now = Date.now();
    // 1 saniye içinde ard arda tıklanıyorsa sayacı artır, yoksa sıfırla
    if (now - lastClickTimeRef.current > 1000) {
      setClickCount(1);
    } else {
      setClickCount((prev) => prev + 1);
    }
    
    lastClickTimeRef.current = now;

    if (clickCount + 1 >= 5) {
      setClickCount(0);
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/easter-eggs/metal pipe falling sound effect.mp3'),
          { shouldPlay: true, volume: 1.0 }
        );
        soundRef.current = sound;
        
        // Son ses olması için
        await sound.setVolumeAsync(1.0);
        await sound.playAsync();
        
        setIsModalVisible(true);
      } catch (error) {
        console.log('Easter egg failed to play:', error);
      }
    }
  };

  return (
    <>
      <Pressable 
        onPress={handlePress} 
        className="flex-row items-center gap-2"
        // Opaklık animasyonunu kapatmak için
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <Image 
          source={require('@/assets/apptivity/apptivity_logo.svg')} 
          style={{ width: 26, height: 26 }} 
          contentFit="contain" 
        />
        <Text className="font-sans-bold text-lg text-primary-600">
          Apptivity
        </Text>
      </Pressable>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full items-center overflow-hidden rounded-3xl bg-white p-6 shadow-xl">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-rose-100">
              <Text className="text-3xl">🪈</Text>
            </View>
            <Text className="mb-2 text-center font-sans-bold text-xl text-slate-900">
              Oops!
            </Text>
            <Text className="mb-6 text-center text-base text-slate-500">
              Lütfen uygulamayı bozmaya çalışma :)
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              className="w-full items-center rounded-xl bg-primary-600 py-3.5"
            >
              <Text className="font-sans-bold text-base text-white">Tamam, Söz!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
