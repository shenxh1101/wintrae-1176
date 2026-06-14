import React, { useEffect, useRef } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
import { useAppStore } from '@/store';
import './app.scss';

function App(props) {
  const initialized = useRef(false);
  const initFromStorage = useAppStore(s => s.initFromStorage);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initFromStorage();
      console.log('[App] Store initialized');
    }
  }, [initFromStorage]);

  useDidShow(() => {
    if (initialized.current) {
      initFromStorage();
    }
  });

  useDidHide(() => {});

  return props.children;
}

export default App;
