import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { liuliMoods, type LiuliMood } from '../components/liuli/LiuliArt';
import { LiuliPlanet } from '../components/liuli/LiuliPlanet';
import { LiuliMoodButton } from '../components/liuli/LiuliMoodButton';
import { useAmbientMotion } from '../hooks/useAmbientMotion';

const ink = '#203D51';

/** 独立美术样板：不挂载昵称或记录 Provider，不读取和写入真实记录。 */
export function LiuliMotionPreview() {
  const [mood, setMood] = useState<LiuliMood>('calm');
  const [responseKey, setResponseKey] = useState(0);
  const { reduceMotion: reduced, foreground: enabled } = useAmbientMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const frameWidth = frame.width || width;
  const frameHeight = frame.height || height;
  const stageSize = Math.max(180, Math.min(frameWidth - 40, 350, frameHeight - insets.top - insets.bottom - 310));
  const size = stageSize * 0.92;
  const selected = liuliMoods.find(item => item.type === mood)!;

  return <SafeAreaView testID="liuli-motion-preview" style={styles.screen} edges={['top', 'bottom', 'left', 'right']}
    onLayout={({ nativeEvent: { layout } }) => setFrame(current => current.width === layout.width && current.height === layout.height
      ? current : { width: layout.width, height: layout.height })}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topline}>
        <Text style={styles.kicker}>琉璃星球 · 动态样板</Text>
        {Platform.OS === 'web' && <Pressable accessibilityRole="link" accessibilityLabel="打开正式 App"
          onPress={() => window.location.assign('/')} style={styles.returnButton}>
          <Text style={styles.returnText}>打开 App ↗</Text>
        </Pressable>}
      </View>
      <Text style={styles.title}>今天怎么样？</Text>
      <View testID="liuli-stage" style={[styles.stage, { width: stageSize, height: stageSize }]}>
        <LiuliPlanet mood={mood} size={size} enabled={enabled} reduceMotion={reduced} responseKey={responseKey} />
      </View>
      <Text testID="liuli-selected-label" style={[styles.mood, { color: selected.color }]} accessibilityLiveRegion="polite">{selected.label}</Text>
      <Text style={styles.description}>{selected.note}</Text>

      <View style={styles.choices}>
        {liuliMoods.map(item => <LiuliMoodButton preview key={item.type} mood={item.type} selected={mood === item.type}
          reduced={reduced || !enabled} onSelect={() => { setMood(item.type); setResponseKey(value => value + 1); }} />)}
      </View>

      <Text style={styles.notice}>这里只预览动效，不会保存心情记录。</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCFBF3' },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18 },
  topline: { width: '100%', minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: '#6B8075', fontSize: 12, lineHeight: 20 },
  returnButton: { minHeight: 40, justifyContent: 'center', paddingLeft: 12 },
  returnText: { color: '#537065', fontSize: 12, lineHeight: 20 },
  title: { color: ink, fontSize: 27, lineHeight: 40, fontWeight: '500', alignSelf: 'flex-start', marginTop: 10 },
  stage: { marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  mood: { marginTop: 8, fontSize: 19, lineHeight: 29, fontWeight: '600' },
  description: { marginTop: 4, fontSize: 12, lineHeight: 22, color: '#6D7E74' },
  choices: { marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 7 },
  notice: { marginTop: 18, fontSize: 11, lineHeight: 20, color: '#849085', textAlign: 'center' },
});
