const connectionStatus = document.getElementById("connection-status")
const createOfferBtn = document.getElementById("create-offer")

const sdpOfferTextarea = document.getElementById("sdp-offer")

const receiveOfferAndCreateAnswerBtn = document.getElementById("send-offer") // Renamed
const sdpAnswerTextarea = document.getElementById("sdp-answer")

const sendAnswerBtn = document.getElementById("send-answer")
const localIceCandidatesTextarea = document.getElementById(
  "local-ice-candidates"
)

const remoteIceCandidatesTextarea = document.getElementById(
  "remote-ice-candidates"
)
const addRemoteIceCandidatesBtn = document.getElementById(
  "add-remote-ice-candidates"
)
const gameMessagesDiv = document.getElementById("game-messages")
const messageInput = document.getElementById("message-input")
const sendMessageBtn = document.getElementById("send-message")
const advertiseBtn = document.getElementById("advertise")
const scanBtn = document.getElementById("scan")
const bluetoothStatusDiv = document.getElementById("bluetooth-status")

// Disable message input and button by default
messageInput.disabled = true
sendMessageBtn.disabled = true

let peerConnection
let dataChannel

document.addEventListener("DOMContentLoaded", () => {
  createPeerConnection() // Initialize peerConnection once on load
  connectionStatus.textContent = `Initial connection state: ${peerConnection.connectionState}`
})

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(configuration)

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("New ICE candidate:", event.candidate)
      localIceCandidatesTextarea.value += JSON.stringify(event.candidate) + "\n"

      connectionStatus.textContent = "Gathering ICE candidates..."
    }
  }

  peerConnection.onconnectionstatechange = () => {
    connectionStatus.textContent = `Connection state: ${peerConnection.connectionState}`
    console.log("Connection state change:", peerConnection.connectionState)
  }

  peerConnection.oniceconnectionstatechange = () => {
    console.log(
      "ICE connection state change:",
      peerConnection.iceConnectionState
    )
    connectionStatus.textContent = `ICE connection state: ${peerConnection.iceConnectionState}`
  }

  peerConnection.ondatachannel = (event) => {
    console.log("ondatachannel event triggered.")
    dataChannel = event.channel
    setupDataChannel()
  }
}

function setupDataChannel() {
  dataChannel.onopen = () => {
    console.log("Data channel is open")
    gameMessagesDiv.innerHTML += "<p>Data channel open!</p>"
    messageInput.disabled = false
    sendMessageBtn.disabled = false
    connectionStatus.textContent =
      "Connection established! You can now send messages."
  }

  dataChannel.onmessage = (event) => {
    console.log("Message received:", event.data)
    gameMessagesDiv.innerHTML += `<p>Peer: ${event.data}</p>`
  }

  dataChannel.onclose = () => {
    console.log("Data channel closed")
    gameMessagesDiv.innerHTML += "<p>Data channel closed!</p>"
    messageInput.disabled = true
    sendMessageBtn.disabled = true
    connectionStatus.textContent = "Connection closed."
  }

  dataChannel.onerror = (error) => {
    console.error("Data channel error:", error)
    gameMessagesDiv.innerHTML += `<p>Data channel error: ${error.message}</p>`
    messageInput.disabled = true
    sendMessageBtn.disabled = true
    connectionStatus.textContent = `Connection error: ${error.message}`
  }
}

createOfferBtn.onclick = async () => {
  connectionStatus.textContent = "Creating offer..."
  if (!dataChannel) {
    dataChannel = peerConnection.createDataChannel("game_channel")
    setupDataChannel()
  }

  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)
  sdpOfferTextarea.value = JSON.stringify(offer)
  connectionStatus.textContent =
    "Offer created. Copy SDP and local ICE candidates to other peer."
}

receiveOfferAndCreateAnswerBtn.onclick = async () => {
  connectionStatus.textContent = "Receiving offer and creating answer..."
  const offer = JSON.parse(sdpOfferTextarea.value)
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)
  sdpAnswerTextarea.value = JSON.stringify(answer)
  connectionStatus.textContent =
    "Answer created. Copy SDP and local ICE candidates to other peer."
}

sendAnswerBtn.onclick = async () => {
  const answer = JSON.parse(sdpAnswerTextarea.value)
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
  connectionStatus.textContent = "Answer received. Connection established."
}

addRemoteIceCandidatesBtn.onclick = async () => {
  const inputValue = remoteIceCandidatesTextarea.value.trim()
  let candidatesToProcess = []

  try {
    // Try parsing as a single JSON object (e.g., from a QR code)
    const parsedInput = JSON.parse(inputValue)
    if (Array.isArray(parsedInput)) {
      candidatesToProcess = parsedInput
    } else if (typeof parsedInput === "object") {
      candidatesToProcess.push(parsedInput)
    }
  } catch (e) {
    // If not a single JSON object, assume it's multiple lines of JSON strings
    candidatesToProcess = inputValue
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line))
  }

  for (const candidate of candidatesToProcess) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      connectionStatus.textContent = "ICE candidate added."
    } catch (e) {
      console.error("Error adding received ICE candidate", e)
      connectionStatus.textContent = `Error adding ICE candidate: ${e.message}`
    }
  }
}

sendMessageBtn.onclick = () => {
  const message = messageInput.value
  if (dataChannel && dataChannel.readyState === "open") {
    dataChannel.send(message)
    gameMessagesDiv.innerHTML += `<p>You: ${message}</p>`
    messageInput.value = ""
  } else {
    console.error(
      "Data channel not open. Current state:",
      dataChannel ? dataChannel.readyState : "null"
    )
    gameMessagesDiv.innerHTML += "<p>Error: Data channel not open.</p>"
  }
}

const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
const SDP_OFFER_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
const SDP_ANSWER_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
const ICE_CANDIDATES_UUID = "6e400004-b5a3-f393-e0a9-e50e24dcca9e"

let bluetoothDevice
let gattServer

advertiseBtn.onclick = async () => {
  try {
    bluetoothStatusDiv.textContent = "Advertising..."
    const advertisingOptions = {
      services: [SERVICE_UUID],
    }

    await navigator.bluetooth.requestLEScan(advertisingOptions)

    const sdpOffer = sdpOfferTextarea.value
    const iceCandidates = localIceCandidatesTextarea.value

    const service = await gattServer.getPrimaryService(SERVICE_UUID)
    const sdpOfferCharacteristic =
      await service.getCharacteristic(SDP_OFFER_UUID)
    const iceCandidatesCharacteristic =
      await service.getCharacteristic(ICE_CANDIDATES_UUID)

    await sdpOfferCharacteristic.writeValue(new TextEncoder().encode(sdpOffer))
    await iceCandidatesCharacteristic.writeValue(
      new TextEncoder().encode(iceCandidates)
    )

    bluetoothStatusDiv.textContent = "Advertising successfully!"
  } catch (error) {
    console.error("Bluetooth advertising failed:", error)
    bluetoothStatusDiv.textContent = `Advertising failed: ${error.message}`
  }
}

scanBtn.onclick = async () => {
  try {
    bluetoothStatusDiv.textContent = "Scanning for devices..."
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
    })
    bluetoothStatusDiv.textContent = `Connecting to ${bluetoothDevice.name}...`
    gattServer = await bluetoothDevice.gatt.connect()
    bluetoothStatusDiv.textContent = "Connected to device."

    const service = await gattServer.getPrimaryService(SERVICE_UUID)
    const sdpAnswerCharacteristic =
      await service.getCharacteristic(SDP_ANSWER_UUID)
    const iceCandidatesCharacteristic =
      await service.getCharacteristic(ICE_CANDIDATES_UUID)

    const sdpAnswerValue = await sdpAnswerCharacteristic.readValue()
    const iceCandidatesValue = await iceCandidatesCharacteristic.readValue()

    sdpAnswerTextarea.value = new TextDecoder().decode(sdpAnswerValue)
    remoteIceCandidatesTextarea.value = new TextDecoder().decode(
      iceCandidatesValue
    )

    bluetoothStatusDiv.textContent = "Data received successfully!"
  } catch (error) {
    console.error("Bluetooth scanning failed:", error)
    bluetoothStatusDiv.textContent = `Scanning failed: ${error.message}`
  }
}
;("")
