/* eslint-disable react/prop-types */
import React, { useState, useEffect, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import './ChannelViewContent.scss';

import dateFormat from 'dateformat';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { getUsername, doesRoomHaveUnread } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';
import { diffMinutes, isNotInSameDay } from '../../../util/common';

import Divider from '../../atoms/divider/Divider';
import Message, { PlaceholderMessage } from '../../molecules/message/Message';
import * as Media from '../../molecules/media/Media';
import ChannelIntro from '../../molecules/channel-intro/ChannelIntro';
import TimelineChange from '../../molecules/message/TimelineChange';

import { parseReply, parseTimelineChange } from './common';

const MAX_MSG_DIFF_MINUTES = 5;

let wasAtBottom = true;
function ChannelViewContent({
  roomId, roomTimeline, timelineScroll, viewEvent,
}) {
  const [isReachedTimelineEnd, setIsReachedTimelineEnd] = useState(false);
  const [onStateUpdate, updateState] = useState(null);
  const [onPagination, setOnPagination] = useState(null);
  const mx = initMatrix.matrixClient;

  function autoLoadTimeline() {
    if (timelineScroll.isScrollable() === true) return;
    roomTimeline.paginateBack();
  }
  function trySendingReadReceipt() {
    const { room, timeline } = roomTimeline;
    if (doesRoomHaveUnread(room) && timeline.length !== 0) {
      mx.sendReadReceipt(timeline[timeline.length - 1]);
    }
  }

  function onReachedTop() {
    if (roomTimeline.isOngoingPagination || isReachedTimelineEnd) return;
    roomTimeline.paginateBack();
  }
  function toggleOnReachedBottom(isBottom) {
    wasAtBottom = isBottom;
    if (!isBottom) return;
    trySendingReadReceipt();
  }

  const updatePAG = (canPagMore) => {
    if (!canPagMore) {
      setIsReachedTimelineEnd(true);
    } else {
      setOnPagination({});
      autoLoadTimeline();
    }
  };
  // force update RoomTimeline on cons.events.roomTimeline.EVENT
  const updateRT = () => {
    if (wasAtBottom) {
      trySendingReadReceipt();
    }
    updateState({});
  };

  useEffect(() => {
    setIsReachedTimelineEnd(false);
    wasAtBottom = true;
  }, [roomId]);
  useEffect(() => trySendingReadReceipt(), [roomTimeline]);

  // init room setup completed.
  // listen for future. setup stateUpdate listener.
  useEffect(() => {
    roomTimeline.on(cons.events.roomTimeline.EVENT, updateRT);
    roomTimeline.on(cons.events.roomTimeline.PAGINATED, updatePAG);
    viewEvent.on('reached-top', onReachedTop);
    viewEvent.on('toggle-reached-bottom', toggleOnReachedBottom);

    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.EVENT, updateRT);
      roomTimeline.removeListener(cons.events.roomTimeline.PAGINATED, updatePAG);
      viewEvent.removeListener('reached-top', onReachedTop);
      viewEvent.removeListener('toggle-reached-bottom', toggleOnReachedBottom);
    };
  }, [roomTimeline, isReachedTimelineEnd, onPagination]);

  useLayoutEffect(() => {
    timelineScroll.reachBottom();
    autoLoadTimeline();
  }, [roomTimeline]);

  useLayoutEffect(() => {
    if (onPagination === null) return;
    timelineScroll.tryRestoringScroll();
  }, [onPagination]);

  useEffect(() => {
    if (onStateUpdate === null) return;
    if (wasAtBottom) timelineScroll.reachBottom();
  }, [onStateUpdate]);

  let prevMEvent = null;
  function renderMessage(mEvent) {
    function isMedia(mE) {
      return (
        mE.getContent()?.msgtype === 'm.file'
        || mE.getContent()?.msgtype === 'm.image'
        || mE.getContent()?.msgtype === 'm.audio'
        || mE.getContent()?.msgtype === 'm.video'
      );
    }
    function genMediaContent(mE) {
      const mContent = mE.getContent();
      let mediaMXC = mContent.url;
      let thumbnailMXC = mContent?.info?.thumbnail_url;
      const isEncryptedFile = typeof mediaMXC === 'undefined';
      if (isEncryptedFile) mediaMXC = mContent.file.url;

      switch (mE.getContent()?.msgtype) {
        case 'm.file':
          return (
            <Media.File
              name={mContent.body}
              link={mx.mxcUrlToHttp(mediaMXC)}
              file={mContent.file}
              type={mContent.info.mimetype}
            />
          );
        case 'm.image':
          return (
            <Media.Image
              name={mContent.body}
              width={mContent.info.w || null}
              height={mContent.info.h || null}
              link={mx.mxcUrlToHttp(mediaMXC)}
              file={isEncryptedFile ? mContent.file : null}
              type={mContent.info.mimetype}
            />
          );
        case 'm.audio':
          return (
            <Media.Audio
              name={mContent.body}
              link={mx.mxcUrlToHttp(mediaMXC)}
              type={mContent.info.mimetype}
              file={mContent.file}
            />
          );
        case 'm.video':
          if (typeof thumbnailMXC === 'undefined') {
            thumbnailMXC = mContent.info?.thumbnail_file?.url || null;
          }
          return (
            <Media.Video
              name={mContent.body}
              link={mx.mxcUrlToHttp(mediaMXC)}
              thumbnail={thumbnailMXC === null ? null : mx.mxcUrlToHttp(thumbnailMXC)}
              thumbnailFile={isEncryptedFile ? mContent.info.thumbnail_file : null}
              thumbnailType={mContent.info.thumbnail_info?.mimetype || null}
              width={mContent.info.w || null}
              height={mContent.info.h || null}
              file={isEncryptedFile ? mContent.file : null}
              type={mContent.info.mimetype}
            />
          );
        default:
          return 'Unable to attach media file!';
      }
    }

    if (mEvent.getType() === 'm.room.create') {
      const roomTopic = roomTimeline.room.currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;
      return (
        <ChannelIntro
          key={mEvent.getId()}
          avatarSrc={roomTimeline.room.getAvatarUrl(initMatrix.matrixClient.baseUrl, 80, 80, 'crop')}
          name={roomTimeline.room.name}
          heading={`Welcome to ${roomTimeline.room.name}`}
          desc={`This is the beginning of ${roomTimeline.room.name} channel.${typeof roomTopic !== 'undefined' ? (` Topic: ${roomTopic}`) : ''}`}
          time={`Created at ${dateFormat(mEvent.getDate(), 'dd mmmm yyyy, hh:MM TT')}`}
        />
      );
    }
    if (
      mEvent.getType() !== 'm.room.message'
      && mEvent.getType() !== 'm.room.encrypted'
      && mEvent.getType() !== 'm.room.member'
    ) return false;
    if (mEvent.getRelation()?.rel_type === 'm.replace') return false;

    // ignore if message is deleted
    if (mEvent.isRedacted()) return false;

    let divider = null;
    if (prevMEvent !== null && isNotInSameDay(mEvent.getDate(), prevMEvent.getDate())) {
      divider = <Divider key={`divider-${mEvent.getId()}`} text={`${dateFormat(mEvent.getDate(), 'mmmm dd, yyyy')}`} />;
    }

    if (mEvent.getType() !== 'm.room.member') {
      const isContentOnly = (
        prevMEvent !== null
        && prevMEvent.getType() !== 'm.room.member'
        && diffMinutes(mEvent.getDate(), prevMEvent.getDate()) <= MAX_MSG_DIFF_MINUTES
        && prevMEvent.getSender() === mEvent.getSender()
      );

      let content = mEvent.getContent().body;
      if (typeof content === 'undefined') return null;
      let reply = null;
      let reactions = null;
      let isMarkdown = mEvent.getContent().format === 'org.matrix.custom.html';
      const isReply = typeof mEvent.getWireContent()['m.relates_to']?.['m.in_reply_to'] !== 'undefined';
      const isEdited = roomTimeline.editedTimeline.has(mEvent.getId());
      const haveReactions = roomTimeline.reactionTimeline.has(mEvent.getId());

      if (isReply) {
        const parsedContent = parseReply(content);

        if (parsedContent !== null) {
          const username = getUsername(parsedContent.userId);
          reply = {
            color: colorMXID(parsedContent.userId),
            to: username,
            content: parsedContent.replyContent,
          };
          content = parsedContent.content;
        }
      }

      if (isEdited) {
        const editedList = roomTimeline.editedTimeline.get(mEvent.getId());
        const latestEdited = editedList[editedList.length - 1];
        if (typeof latestEdited.getContent()['m.new_content'] === 'undefined') return null;
        const latestEditBody = latestEdited.getContent()['m.new_content'].body;
        const parsedEditedContent = parseReply(latestEditBody);
        isMarkdown = latestEdited.getContent()['m.new_content'].format === 'org.matrix.custom.html';
        if (parsedEditedContent === null) {
          content = latestEditBody;
        } else {
          content = parsedEditedContent.content;
        }
      }

      if (haveReactions) {
        reactions = [];
        roomTimeline.reactionTimeline.get(mEvent.getId()).forEach((rEvent) => {
          if (rEvent.getRelation() === null) return;
          function alreadyHaveThisReaction(rE) {
            for (let i = 0; i < reactions.length; i += 1) {
              if (reactions[i].key === rE.getRelation().key) return true;
            }
            return false;
          }
          if (alreadyHaveThisReaction(rEvent)) {
            for (let i = 0; i < reactions.length; i += 1) {
              if (reactions[i].key === rEvent.getRelation().key) {
                reactions[i].count += 1;
                if (reactions[i].active !== true) {
                  reactions[i].active = rEvent.getSender() === initMatrix.matrixClient.getUserId();
                }
                break;
              }
            }
          } else {
            reactions.push({
              id: rEvent.getId(),
              key: rEvent.getRelation().key,
              count: 1,
              active: (rEvent.getSender() === initMatrix.matrixClient.getUserId()),
            });
          }
        });
      }

      const myMessageEl = (
        <React.Fragment key={`box-${mEvent.getId()}`}>
          {divider}
          { isMedia(mEvent) ? (
            <Message
              key={mEvent.getId()}
              contentOnly={isContentOnly}
              markdown={isMarkdown}
              avatarSrc={mEvent.sender.getAvatarUrl(initMatrix.matrixClient.baseUrl, 36, 36, 'crop')}
              color={colorMXID(mEvent.sender.userId)}
              name={getUsername(mEvent.sender.userId)}
              content={genMediaContent(mEvent)}
              reply={reply}
              time={`${dateFormat(mEvent.getDate(), 'hh:MM TT')}`}
              edited={isEdited}
              reactions={reactions}
            />
          ) : (
            <Message
              key={mEvent.getId()}
              contentOnly={isContentOnly}
              markdown={isMarkdown}
              avatarSrc={mEvent.sender.getAvatarUrl(initMatrix.matrixClient.baseUrl, 36, 36, 'crop')}
              color={colorMXID(mEvent.sender.userId)}
              name={getUsername(mEvent.sender.userId)}
              content={content}
              reply={reply}
              time={`${dateFormat(mEvent.getDate(), 'hh:MM TT')}`}
              edited={isEdited}
              reactions={reactions}
            />
          )}
        </React.Fragment>
      );

      prevMEvent = mEvent;
      return myMessageEl;
    }
    prevMEvent = mEvent;
    const timelineChange = parseTimelineChange(mEvent);
    if (timelineChange === null) return null;
    return (
      <React.Fragment key={`box-${mEvent.getId()}`}>
        {divider}
        <TimelineChange
          key={mEvent.getId()}
          variant={timelineChange.variant}
          content={timelineChange.content}
          time={`${dateFormat(mEvent.getDate(), 'hh:MM TT')}`}
        />
      </React.Fragment>
    );
  }

  const roomTopic = roomTimeline.room.currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;
  return (
    <div className="channel-view__content">
      <div className="timeline__wrapper">
        {
          roomTimeline.timeline[0].getType() !== 'm.room.create' && !isReachedTimelineEnd && (
            <>
              <PlaceholderMessage key={Math.random().toString(20).substr(2, 6)} />
              <PlaceholderMessage key={Math.random().toString(20).substr(2, 6)} />
              <PlaceholderMessage key={Math.random().toString(20).substr(2, 6)} />
            </>
          )
        }
        {
          roomTimeline.timeline[0].getType() !== 'm.room.create' && isReachedTimelineEnd && (
            <ChannelIntro
              key={Math.random().toString(20).substr(2, 6)}
              avatarSrc={roomTimeline.room.getAvatarUrl(initMatrix.matrixClient.baseUrl, 80, 80, 'crop')}
              name={roomTimeline.room.name}
              heading={`Welcome to ${roomTimeline.room.name}`}
              desc={`This is the beginning of ${roomTimeline.room.name} channel.${typeof roomTopic !== 'undefined' ? (` Topic: ${roomTopic}`) : ''}`}
            />
          )
        }
        { roomTimeline.timeline.map(renderMessage) }
      </div>
    </div>
  );
}
ChannelViewContent.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  timelineScroll: PropTypes.shape({
    reachBottom: PropTypes.func,
    autoReachBottom: PropTypes.func,
    tryRestoringScroll: PropTypes.func,
    enableSmoothScroll: PropTypes.func,
    disableSmoothScroll: PropTypes.func,
    isScrollable: PropTypes.func,
  }).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default ChannelViewContent;
