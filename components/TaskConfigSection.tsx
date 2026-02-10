import { useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import ActionInputModal from './ActionInputModal';
import { ReminderActionType } from '../lib/types';

export interface QuickAction {
  type: ReminderActionType;
  value: any;
  label?: string;
}

interface TaskConfigSectionProps {
  onActionsChange?: (actions: QuickAction[]) => void;
  onRepeatChange?: (repeat: any) => void;
}

const QUICK_ACTIONS: {
  type: ReminderActionType;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
}[] = [
  { type: 'call', icon: 'phone', label: 'Call', color: '#10b981' },
  { type: 'link', icon: 'link', label: 'Link', color: '#3b82f6' },
  { type: 'location', icon: 'location-on', label: 'Location', color: '#f59e0b' },
  { type: 'email', icon: 'email', label: 'Email', color: '#8b5cf6' },
  { type: 'note', icon: 'description', label: 'Note', color: '#6b7280' },
  { type: 'subtasks', icon: 'checklist', label: 'Subtasks', color: '#2F00FF' },
];

function getActionPreview(type: ReminderActionType, value: any): string {
  switch (type) {
    case 'call':
      return value?.phone || 'Phone number';
    case 'link':
      return value?.url?.replace(/^https?:\/\//, '').slice(0, 30) || 'URL';
    case 'email':
      return value?.email || 'Email address';
    case 'location':
      return value?.address?.slice(0, 30) || 'Address';
    case 'note':
      return value?.text?.slice(0, 30) || 'Note';
    case 'subtasks':
      return value?.text ? `${value.text.split('\n').filter((l: string) => l.trim()).length} items` : 'Subtasks';
    default:
      return type;
  }
}

export default function TaskConfigSection({ onActionsChange }: TaskConfigSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [actionValues, setActionValues] = useState<Map<string, any>>(new Map());
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState<ReminderActionType | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const toggleAction = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedActions.has(type)) {
      const newSelected = new Set(selectedActions);
      newSelected.delete(type);
      setSelectedActions(newSelected);

      const newValues = new Map(actionValues);
      newValues.delete(type);
      setActionValues(newValues);

      if (onActionsChange) {
        const actions = Array.from(newValues.entries()).map(([actionType, val]) => ({
          type: actionType as ReminderActionType,
          value: val,
        }));
        onActionsChange(actions);
      }
    } else {
      setSelectedActionType(type as ReminderActionType);
      setShowActionModal(true);
    }
  };

  const handleActionSave = (value: any) => {
    if (!selectedActionType) return;

    const newValues = new Map(actionValues);
    newValues.set(selectedActionType, value);
    setActionValues(newValues);

    const newSelected = new Set(selectedActions);
    newSelected.add(selectedActionType);
    setSelectedActions(newSelected);

    if (onActionsChange) {
      const actions = Array.from(newValues.entries()).map(([type, val]) => ({
        type: type as ReminderActionType,
        value: val,
      }));
      onActionsChange(actions);
    }
  };

  const handleAddAttachment = async (type: 'image' | 'file') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (type === 'image') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setAttachments([...attachments, { type: 'image', uri: result.assets[0].uri }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setAttachments([...attachments, {
          type: 'file',
          uri: result.assets[0].uri,
          name: result.assets[0].name,
        }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const selectedCount = selectedActions.size;
  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.header,
          pressed && { opacity: 0.7 },
        ]}
        onPress={toggleExpanded}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Quick Actions. ${selectedCount} added`}
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <MaterialIcons name="bolt" size={16} color="#2F00FF" />
          </View>
          <Text style={styles.headerText}>Quick Actions</Text>
          {selectedCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selectedCount}</Text>
            </View>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <MaterialIcons name="keyboard-arrow-down" size={20} color="#9ca3af" />
        </Animated.View>
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          {QUICK_ACTIONS.map(({ type, icon, label, color }) => {
            const isSelected = selectedActions.has(type);
            const value = actionValues.get(type);

            return (
              <Pressable
                key={type}
                style={({ pressed }) => [
                  styles.row,
                  isSelected && {
                    backgroundColor: `${color}08`,
                    borderColor: `${color}20`,
                  },
                  pressed && { transform: [{ scale: 0.98 }], opacity: 0.8 },
                ]}
                onPress={() => toggleAction(type)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${label}${isSelected ? '. Added' : ''}`}
              >
                <View style={[styles.rowIcon, { backgroundColor: `${color}12` }]}>
                  <MaterialIcons name={icon} size={20} color={color} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  {isSelected && value && (
                    <Text style={styles.rowPreview} numberOfLines={1}>
                      {getActionPreview(type, value)}
                    </Text>
                  )}
                </View>
                {isSelected ? (
                  <MaterialIcons name="check-circle" size={20} color={color} />
                ) : (
                  <MaterialIcons name="add-circle-outline" size={20} color="#d1d5db" />
                )}
              </Pressable>
            );
          })}

          <View style={styles.attachRow}>
            <Pressable
              style={({ pressed }) => [
                styles.attachBtn,
                pressed && { backgroundColor: '#f0f0f0', transform: [{ scale: 0.97 }] },
              ]}
              onPress={() => handleAddAttachment('image')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Attach photo"
            >
              <MaterialIcons name="photo-camera" size={18} color="#6b7280" />
              <Text style={styles.attachText}>Photo</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.attachBtn,
                pressed && { backgroundColor: '#f0f0f0', transform: [{ scale: 0.97 }] },
              ]}
              onPress={() => handleAddAttachment('file')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Attach file"
            >
              <MaterialIcons name="attach-file" size={18} color="#6b7280" />
              <Text style={styles.attachText}>File</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!expanded && selectedCount > 0 && (
        <View style={styles.chips}>
          {Array.from(selectedActions).map((type) => {
            const config = QUICK_ACTIONS.find(a => a.type === type);
            if (!config) return null;

            return (
              <View key={type} style={[styles.chip, { borderColor: `${config.color}30` }]}>
                <MaterialIcons name={config.icon} size={12} color={config.color} />
                <Text style={[styles.chipText, { color: config.color }]}>{config.label}</Text>
                <Pressable
                  onPress={() => toggleAction(type)}
                  hitSlop={8}
                  style={({ pressed }) => [pressed && { opacity: 0.4 }]}
                >
                  <MaterialIcons name="close" size={12} color="#c4c4c4" />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {attachments.length > 0 && (
        <View style={styles.attachments}>
          {attachments.map((attachment, index) => (
            <View key={index} style={styles.attachmentItem}>
              <MaterialIcons
                name={attachment.type === 'image' ? 'image' : 'insert-drive-file'}
                size={14}
                color="#6b7280"
              />
              <Text style={styles.attachmentText} numberOfLines={1}>
                {attachment.name || 'Photo'}
              </Text>
              <Pressable
                onPress={() => setAttachments(attachments.filter((_, i) => i !== index))}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.5 }]}
              >
                <MaterialIcons name="close" size={14} color="#9ca3af" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <ActionInputModal
        visible={showActionModal}
        actionType={selectedActionType}
        onClose={() => setShowActionModal(false)}
        onSave={handleActionSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Platform.OS === 'ios' ? '#000' : undefined,
    shadowOpacity: Platform.OS === 'ios' ? 0.04 : 0,
    shadowRadius: Platform.OS === 'ios' ? 12 : 0,
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 2 } : { width: 0, height: 0 },
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(47, 0, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 14,
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1a1a1a',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2F00FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'BricolageGrotesque-Bold',
    color: '#ffffff',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 14,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#1a1a1a',
    letterSpacing: -0.2,
  },
  rowPreview: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#9ca3af',
  },
  attachRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    paddingHorizontal: 0,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
    gap: 8,
  },
  attachText: {
    fontSize: 13,
    fontFamily: 'BricolageGrotesque-Medium',
    color: '#6b7280',
    letterSpacing: -0.1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    gap: 5,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Medium',
  },
  attachments: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 6,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f7fc',
    gap: 8,
  },
  attachmentText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'BricolageGrotesque-Regular',
    color: '#6b7280',
  },
});
