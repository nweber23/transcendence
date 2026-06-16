import (
	"sync"
)

type flexPacketChannel struct {
	channel      chan packet
	channelMutex sync.RWMutex
	storage      []packet
	storageMutex sync.Mutex
}

func (flexChannel *flexPacketChannel) SafeWrite(packet packet) (bool) {
	flexChannel.channelMutex.RLock()
	select {
		case flexChannel.channel <- packet:
			flexChannel.channelMutex.RUnlock()
			return
		default:
			flexChannel.channelMutex.RUnlock()
	}
	flexChannel.storageMutex.Lock()
	flexChannel.
	flexChannel.storageMutex.Unlock()
}

func pumpStorage(flexChannel *flexPacketChannel) {
	for {
		flexChannel.storageMutex.Lock()
		for len(channel.storage) > 0 {
			select {
				case flexChannel.channel <- channel.storage[0]
					channel.storage = channel.storage[1:]
				default:
					goto ChannelBlocking
			}
		}
ChannelBlocking:
		flexChannel.storageMutex.Unlock()
		time.Sleep(time.Millisecond * 5)
	}
}

func NewFlexPacketChannel() (flexPacketChannel*) {
	flexChannel := &flexPacketChannel{
		channel: make(chan packet, 256)
	}
	go pumpStorage(flexChannel)
}