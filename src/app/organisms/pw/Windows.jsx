import React, { useState, useEffect } from 'react';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import InviteList from '../invite-list/InviteList';
import PublicChannels from '../public-channels/PublicChannels';
import CreateChannel from '../create-channel/CreateChannel';
import InviteUser from '../invite-user/InviteUser';
import Settings from '../settings/Settings';

function Windows() {
  const [isInviteList, changeInviteList] = useState(false);
  const [isPubilcChannels, changePubilcChannels] = useState(false);
  const [isCreateChannel, changeCreateChannel] = useState(false);
  const [inviteUser, changeInviteUser] = useState({ isOpen: false, roomId: undefined });
  const [settings, changeSettings] = useState(false);

  function openInviteList() {
    changeInviteList(true);
  }
  function openPublicChannels() {
    changePubilcChannels(true);
  }
  function openCreateChannel() {
    changeCreateChannel(true);
  }
  function openInviteUser(roomId) {
    changeInviteUser({
      isOpen: true,
      roomId,
    });
  }
  function openSettings() {
    changeSettings(true);
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.INVITE_LIST_OPENED, openInviteList);
    navigation.on(cons.events.navigation.PUBLIC_CHANNELS_OPENED, openPublicChannels);
    navigation.on(cons.events.navigation.CREATE_CHANNEL_OPENED, openCreateChannel);
    navigation.on(cons.events.navigation.INVITE_USER_OPENED, openInviteUser);
    navigation.on(cons.events.navigation.SETTINGS_OPENED, openSettings);
    return () => {
      navigation.removeListener(cons.events.navigation.INVITE_LIST_OPENED, openInviteList);
      navigation.removeListener(cons.events.navigation.PUBLIC_CHANNELS_OPENED, openPublicChannels);
      navigation.removeListener(cons.events.navigation.CREATE_CHANNEL_OPENED, openCreateChannel);
      navigation.removeListener(cons.events.navigation.INVITE_USER_OPENED, openInviteUser);
      navigation.removeListener(cons.events.navigation.SETTINGS_OPENED, openSettings);
    };
  }, []);

  return (
    <>
      <InviteList
        isOpen={isInviteList}
        onRequestClose={() => changeInviteList(false)}
      />
      <PublicChannels
        isOpen={isPubilcChannels}
        onRequestClose={() => changePubilcChannels(false)}
      />
      <CreateChannel
        isOpen={isCreateChannel}
        onRequestClose={() => changeCreateChannel(false)}
      />
      <InviteUser
        isOpen={inviteUser.isOpen}
        roomId={inviteUser.roomId}
        onRequestClose={() => changeInviteUser({ isOpen: false, roomId: undefined })}
      />
      <Settings
        isOpen={settings}
        onRequestClose={() => changeSettings(false)}
      />
    </>
  );
}

export default Windows;
