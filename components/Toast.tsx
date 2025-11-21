import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';

export interface ToastHandles {
  show: (options: ToastOptions) => void;
}

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

const Toast = forwardRef<ToastHandles, {}>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ToastOptions>({ message: '', type: 'info' });
  const opacity = useState(new Animated.Value(0))[0];

  useImperativeHandle(ref, () => ({
    show: (toastOptions) => {
      setOptions(toastOptions);
      setVisible(true);
    },
  }));

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        const timer = setTimeout(() => {
          hide();
        }, options.duration || 3000);
        return () => clearTimeout(timer);
      });
    }
  }, [visible]);

  const hide = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  if (!visible) {
    return null;
  }

  const getBackgroundColor = () => {
    switch (options.type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'info':
      default:
        return '#2196F3';
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.message}>{options.message}</Text>
      <TouchableOpacity onPress={hide}>
        <X size={18} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  message: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
});

export default Toast;