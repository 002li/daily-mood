import { StyleSheet } from 'react-native';

export const colors = {
  background: '#FAF9F5',
  surface: '#FFFFFF',
  text: '#35443D',
  muted: '#6D776F',
  primary: '#687E6D',
  border: '#E8EAE2',
};

// 只共享三个页面重复的基础排版，功能样式随对应页面逐步加入。
export const screenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  brand: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    marginTop: 12,
    color: colors.text,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 40,
  },
  description: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 26,
  },
  card: {
    marginTop: 32,
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  symbol: {
    fontSize: 44,
    lineHeight: 64,
  },
  cardTitle: {
    marginTop: 16,
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardDescription: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'center',
  },
});
