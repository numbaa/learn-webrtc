const initButton = document.getElementById('init');
const connectButton = document.getElementById('connect');
const stopButton = document.getElementById('stop');
initButton.disabled = false;
connectButton.disabled = true;
stopButton.disabled = true;

var gotLocalMedia = false;
var websocketConnected = false;

//指video标签
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
//指媒体本身
var localMedia;
const userMediaConstraint = {
    'video': true,
    'autio': false,
};

const iceServers = [{urls: 'stun:stun1.xxx.com'}];
const offerOptions = {
    offerToReceiveVideo: 1,
    offerToReceiveAudio: 1,
};

var signalWebSocket;

function onInitButtonClick() {
    initButton.disabled = true;
    initWebSocket();
    try {
        localMedia = await navigator.getUserMedia(userMediaConstraint);
        localVideo.srcObject = localMedia;
        gotLocalMedia = true;
        if (gotLocalMedia && websocketConnected) {
            connectButton.disabled = false;
        }
    } catch(error) {
        console.error('获取本地媒体设备失败', error);
        return;
    }
}

function onConnectButtonClick() {
    connectButton.disabled = true;
    stopButton.disabled = false;
    const localVideoTracks = localMedia.getVideoTracks();
    const localAudioTracks = localMedia.getAudioTracks();
    if (localVideoTracks.length == 0) {
        console.error('获取到本地视频源数量为0');
    }
    if (localAudioTracks.length == 0) {
        console.error('获取到本地音频源数量为0');
    }
    const peerConnection = new RTCPeerConnection({iceServers:iceServers});
    //本地浏览器触发
    peerConnection.icecandidate = onIceCandidate;
    peerConnection.iceconnectionstatechange = onIceConnectionStateChange;
    //收到对端的流媒体
    peerConnection.onaddstream = onRemoteMedia;

    try {
        const sdp = await peerConnection.createOffer(offerOptions);
        await peerConnection.setLocalDescription(sdp);
        //TODO: 通过WebSocket发送sdp
    } catch (error) {
        console.error('创建并设置本地offer失败', error);
    }
}

function onIceCandidate(event) {
    const iceCandidate = event.candidate;
    if (iceCandidate) {
        //TODO: 通过WebSocket发送iceCandidate
    }
}

function onIceConnectionStateChange(event) {
    console.log('onIceConnectionStateChange:', event);
}

function initWebSocket() {
    signalWebSocket = new WebSocket('ws://signaling.server.com');
    signalWebSocket.onopen = function() {
        websocketConnected = true;
        if (websocketConnected && gotLocalMedia) {
            connectButton.disabled = false;
        }
    };

    signalWebSocket.onmessage = function(event) {
        const data = event.data;
        if (typeof data === String) {
            //处理消息
        } else {
            console.error('websocket不支持该消息类型:',data);
        }
    };

    signalWebSocket.onclose = function() {
        console.log('websocket closed');
    };

    signalWebSocket.onerror = function(event) {
        console.error('websocekt error:', event);
    }
}

function onRemoteMedia(event) {
    console.log('收到对端流媒体');
    remoteVideo.srcObject = event.stream;
}