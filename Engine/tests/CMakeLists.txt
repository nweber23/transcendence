cmake_minimum_required(VERSION 3.14)

include(FetchContent)
FetchContent_Declare(
  catch2
  GIT_REPOSITORY https://github.com/catchorg/Catch2.git
  GIT_TAG v3.4.0
)
FetchContent_MakeAvailable(catch2)

include(FetchContent)
FetchContent_Declare(
  glaze
  GIT_REPOSITORY https://github.com/stephenberry/glaze.git
  GIT_TAG v3.6.0
  SOURCE_SUBDIR ""
)
set(glaze_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(glaze_BUILD_TESTS OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(glaze)

add_executable(card_test card_test.cpp)
target_include_directories(card_test PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/shared/includes)

# Build card implementation as a small static library and link it into the test
add_library(cards_impl STATIC ${CMAKE_SOURCE_DIR}/games/cardGames/shared/src/card.cpp)
target_include_directories(cards_impl PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/shared/includes)

target_link_libraries(card_test PRIVATE Catch2::Catch2WithMain cards_impl)

include(CTest)
add_test(NAME card_test COMMAND card_test)

add_executable(deck_test deck_test.cpp)
target_include_directories(deck_test PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/shared/includes)

# Build deck implementation and link with card impl
add_library(deck_impl STATIC ${CMAKE_SOURCE_DIR}/games/cardGames/shared/src/deck.cpp)
target_include_directories(deck_impl PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/shared/includes)

target_link_libraries(deck_test PRIVATE Catch2::Catch2WithMain deck_impl cards_impl)
add_test(NAME deck_test COMMAND deck_test)

# Blackjack library
add_library(blackjack_impl STATIC
    ${CMAKE_SOURCE_DIR}/games/cardGames/blackJack/src/hand.cpp
    ${CMAKE_SOURCE_DIR}/games/cardGames/blackJack/src/game.cpp
    ${CMAKE_SOURCE_DIR}/games/cardGames/blackJack/src/engine.cpp
)
target_include_directories(blackjack_impl PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/blackJack/includes)
target_include_directories(blackjack_impl PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/shared/includes)
target_link_libraries(blackjack_impl PUBLIC glaze::glaze)

add_executable(blackjack_test blackjack_test.cpp)
target_include_directories(blackjack_test PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/shared/includes)
target_include_directories(blackjack_test PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/blackJack/includes)
target_link_libraries(blackjack_test PRIVATE Catch2::Catch2WithMain blackjack_impl deck_impl cards_impl)
add_test(NAME blackjack_test COMMAND blackjack_test)

# Texas Holdem library
add_library(texasHoldem_impl STATIC
    ${CMAKE_SOURCE_DIR}/games/cardGames/texasHoldem/src/game.cpp
    ${CMAKE_SOURCE_DIR}/games/cardGames/texasHoldem/src/player.cpp
)
target_include_directories(texasHoldem_impl PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/texasHoldem/includes)
target_include_directories(texasHoldem_impl PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/shared/includes)

add_executable(texasHoldem_test texasHoldem_test.cpp)
target_include_directories(texasHoldem_test PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/shared/includes)
target_include_directories(texasHoldem_test PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/texasHoldem/includes)
target_link_libraries(texasHoldem_test PRIVATE Catch2::Catch2WithMain texasHoldem_impl deck_impl cards_impl)
add_test(NAME texasHoldem_test COMMAND texasHoldem_test)

# Slot machine library
add_library(slotmachine_impl STATIC
    ${CMAKE_SOURCE_DIR}/games/slotMachine/src/machines.cpp
)
target_include_directories(slotmachine_impl PRIVATE ${CMAKE_SOURCE_DIR}/games/slotMachine/includes)
target_link_libraries(slotmachine_impl PUBLIC glaze::glaze)

add_executable(slotmachine_test slotmachine_test.cpp)
target_include_directories(slotmachine_test PRIVATE ${CMAKE_SOURCE_DIR}/games/slotMachine/includes)
target_link_libraries(slotmachine_test PRIVATE Catch2::Catch2WithMain slotmachine_impl)
add_test(NAME slotmachine_test COMMAND slotmachine_test WORKING_DIRECTORY ${CMAKE_SOURCE_DIR})
