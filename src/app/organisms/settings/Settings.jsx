import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './Settings.scss';

import initMatrix from '../../../client/initMatrix';
import settings from '../../../client/state/settings';

import {Text} from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import SegmentedControls from '../../atoms/segmented-controls/SegmentedControls';

import PopupWindow, { PWContentSelector } from '../../molecules/popup-window/PopupWindow';
import SettingTile from '../../molecules/setting-tile/SettingTile';
import ImportE2ERoomKeys from '../../molecules/import-e2e-room-keys/ImportE2ERoomKeys';

import SunIC from '../../../../public/res/ic/outlined/sun.svg';
import LockIC from '../../../../public/res/ic/outlined/lock.svg';
import InfoIC from '../../../../public/res/ic/outlined/info.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import CinnySVG from '../../../../public/res/svg/cinny.svg';

function AppearanceSection() {
  return (
    <div className="settings-content">
      <SettingTile
        title="Theme"
        content={(
          <SegmentedControls
            selected={settings.getThemeIndex()}
            segments={[
              { text: 'Light' },
              { text: 'Silver' },
              { text: 'Dark' },
              { text: 'Butter' },
            ]}
            onSelect={(index) => settings.setTheme(index)}
          />
        )}
      />
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="set-security settings-content">
      <SettingTile
        title={`Device ID: ${initMatrix.matrixClient.getDeviceId()}`}
        content={<Text variant="b3">Use this device ID to verify or manage this session from Element client.</Text>}
      />
      <SettingTile
        title="Import E2E room keys"
        content={(
          <>
            <Text variant="b3">{'To decrypt older messages, Export E2EE room keys from Element (Settings > Security & Privacy > Encryption > Cryptography) and import them here. Imported keys are also encrypted so you have to enter account password.'}</Text>
            <ImportE2ERoomKeys />
          </>
        )}
      />
    </div>
  );
}

function AboutSection() {
  return (
    <div className="settings-content settings__about">
      <div className="set-about__branding">
        <img width="60" height="60" src={CinnySVG} alt="Cinny logo" />
        <div>
          <Text variant="h2">
            Cinny
            <span className="text text-b3" style={{ margin: '0 var(--sp-extra-tight)' }}>v1.0.0</span>
          </Text>
          <Text>Yet another matrix client</Text>

          <div className="set-about__btns">
            <Button onClick={() => window.open('https://github.com/ajbura/cinny')}>Source code</Button>
            <Button onClick={() => window.open('https://liberapay.com/ajbura/donate')}>Support</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings({ isOpen, onRequestClose }) {
  const settingSections = [{
    name: 'Appearance',
    iconSrc: SunIC,
    render() {
      return <AppearanceSection />;
    },
  }, {
    name: 'Security & Privacy',
    iconSrc: LockIC,
    render() {
      return <SecuritySection />;
    },
  }, {
    name: 'Help & About',
    iconSrc: InfoIC,
    render() {
      return <AboutSection />;
    },
  }];
  const [selectedSection, setSelectedSection] = useState(settingSections[0]);

  return (
    <PopupWindow
      className="settings-window"
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Settings"
      contentTitle={selectedSection.name}
      drawer={
        settingSections.map((section) => (
          <PWContentSelector
            key={section.name}
            selected={selectedSection.name === section.name}
            onClick={() => setSelectedSection(section)}
            iconSrc={section.iconSrc}
          >
            {section.name}
          </PWContentSelector>
        ))
      }
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip="Close" />}
    >
      {selectedSection.render()}
    </PopupWindow>
  );
}

Settings.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onRequestClose: PropTypes.func.isRequired,
};

export default Settings;
