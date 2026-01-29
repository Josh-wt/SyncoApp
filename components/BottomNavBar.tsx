import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { AddButtonIcon, CalendarIcon, CloseButtonIcon, NotificationIcon } from './icons';
import CreateReminderModal, { CreationMode } from './CreateReminderModal';

// Animated FAB Component
function AnimatedFAB({
  isOpen,
  onPress,
}: {
  isOpen: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(rotateAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [isOpen, rotateAnim]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 400,
        friction: 10,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ scale: scaleAnim }, { rotate: rotation }],
          },
        ]}
      >
        {isOpen ? <CloseButtonIcon /> : <AddButtonIcon />}
      </Animated.View>
    </Pressable>
  );
}

// Animated Nav Icon Component
function AnimatedNavIcon({
  onPress,
  isActive,
  children,
}: {
  onPress: () => void;
  isActive: boolean;
  children: React.ReactNode;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.navIcon,
          isActive && styles.navIconActive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export type TabName = 'dashboard' | 'calendar' | 'notifications' | 'settings';

interface BottomNavBarProps {
  activeTab?: TabName;
  onTabPress?: (tab: TabName) => void;
  onCreateReminder?: (mode: CreationMode) => void;
  showFirstTimeHint?: boolean;
  onDismissHint?: () => void;
}

export default function BottomNavBar({
  activeTab = 'dashboard',
  onTabPress,
  onCreateReminder,
  showFirstTimeHint = false,
  onDismissHint,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showHint, setShowHint] = useState(showFirstTimeHint);

  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hintBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setShowHint(showFirstTimeHint);
  }, [showFirstTimeHint]);

  useEffect(() => {
    if (showHint) {
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(hintOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(hintBounce, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]),
      ]).start();

      // Subtle bounce animation loop
      const bounceLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(hintBounce, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(hintBounce, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      bounceLoop.start();

      return () => bounceLoop.stop();
    }
  }, [showHint, hintOpacity, hintBounce]);

  const handleAddPress = () => {
    if (showHint) {
      setShowHint(false);
      onDismissHint?.();
    }
    setIsModalOpen(!isModalOpen);
  };

  const handleSelectMode = (mode: CreationMode) => {
    setIsModalOpen(false);
    onCreateReminder?.(mode);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <CreateReminderModal
        visible={isModalOpen}
        onSelectMode={handleSelectMode}
        onClose={handleCloseModal}
      />

      {showHint && !isModalOpen && (
        <Animated.View
          style={[
            styles.hintContainer,
            {
              bottom: insets.bottom + 100,
              opacity: hintOpacity,
              transform: [{ scale: hintBounce }],
            },
          ]}
        >
          <View style={styles.hintBubble}>
            <Text style={styles.hintText}>Tap below to create a reminder</Text>
          </View>
          <View style={styles.hintArrow} />
        </Animated.View>
      )}

      <View style={[styles.navContainer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.navBarWrapper}>
          <Svg width="100%" height={88} viewBox="-60 0 460 88" style={styles.navBarBg}>
            <Defs>
              <ClipPath id="navClip">
                <Path d="M-5 12 H118 C123 12 127 14 129 18 C134 28 145 58 170 58 C195 58 206 28 211 18 C213 14 217 12 222 12 H345 A32 32 0 0 1 345 76 H-5 A32 32 0 0 1 -5 12 Z" />
              </ClipPath>
            </Defs>
            <Rect x="-60" y="0" width="460" height="88" fill="#ffffff" clipPath="url(#navClip)" />
          </Svg>
          <View style={styles.navIconsOverlay}>
            <View style={styles.navGroup}>
              <AnimatedNavIcon onPress={() => onTabPress?.('dashboard')} isActive={activeTab === 'dashboard'}>
                <MaterialIcons
                  name="dashboard"
                  size={26}
                  color={activeTab === 'dashboard' ? '#2F00FF' : '#d1d5db'}
                />
              </AnimatedNavIcon>
              <AnimatedNavIcon onPress={() => onTabPress?.('calendar')} isActive={activeTab === 'calendar'}>
                <CalendarIcon />
              </AnimatedNavIcon>
            </View>
            <View style={styles.navGroup}>
              <AnimatedNavIcon onPress={() => onTabPress?.('notifications')} isActive={activeTab === 'notifications'}>
                <NotificationIcon />
              </AnimatedNavIcon>
              <AnimatedNavIcon onPress={() => onTabPress?.('settings')} isActive={activeTab === 'settings'}>
                <MaterialIcons
                  name="settings"
                  size={26}
                  color={activeTab === 'settings' ? '#2F00FF' : '#d1d5db'}
                />
              </AnimatedNavIcon>
            </View>
          </View>
        </View>

        <View style={styles.addButton}>
          <AnimatedFAB isOpen={isModalOpen} onPress={handleAddPress} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  navBarWrapper: {
    width: '90%',
    height: 88,
    position: 'relative',
  },
  navBarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  navIconsOverlay: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    height: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  navGroup: {
    flexDirection: 'row',
    gap: 28,
  },
  navIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  navIconActive: {
    backgroundColor: 'rgba(47, 0, 255, 0.08)',
  },
  fabContainer: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    // 3D effect with cyan glow
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  addButton: {
    position: 'absolute',
    top: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconStack: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 150,
  },
  hintBubble: {
    backgroundColor: '#2F00FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#2F00FF',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  hintText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
  },
  hintArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2F00FF',
    marginTop: -1,
  },
});
