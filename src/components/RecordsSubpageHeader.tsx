import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import type { AppTabParamList } from '../navigation/AppNavigator';
import { useSpaceScene } from '../navigation/SpaceScene';
import { useAppTheme } from '../state/AppThemeContext';

export function RecordsSubpageHeader({ title }: { title: string }) {
  const { colors } = useAppTheme();
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const space = useSpaceScene();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Pressable testID="back-to-records" accessibilityRole="button" accessibilityLabel="返回轨迹"
      onPress={() => space.travel('Records', () => navigation.navigate('Records'))}
      style={({ pressed }) => ({ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ color: colors.primary, fontSize: 29, lineHeight: 36 }}>‹</Text>
    </Pressable>
    <Text accessibilityRole="header" style={{ color: colors.text, flex: 1, fontSize: 26, lineHeight: 38, fontWeight: '500' }}>{title}</Text>
  </View>;
}
