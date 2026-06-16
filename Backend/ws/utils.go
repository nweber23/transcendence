func closeIfOpen(channel chan packet) {
	select {
		case _, ok <- channel:
			if ok {
				close(channel)
			}
		default:
			close(channel)
	}
}