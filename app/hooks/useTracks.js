import { useState, useEffect } from 'react';

function useTracks(friendID) {
  const [tracks, setTracks] = useState(null);

  useEffect(() => {
    function handleStatusChange(status) {
        setTracks(status.isOnline);
    }

    // ChatAPI.subscribeToFriendStatus(friendID, handleStatusChange);
    // return () => {
    //   ChatAPI.unsubscribeFromFriendStatus(friendID, handleStatusChange);
    // };
  });

  return tracks;
}