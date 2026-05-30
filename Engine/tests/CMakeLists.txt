cmake_minimum_required(VERSION 3.14)

include(FetchContent)
FetchContent_Declare(
  catch2
  GIT_REPOSITORY https://github.com/catchorg/Catch2.git
  GIT_TAG v3.4.0
)
FetchContent_MakeAvailable(catch2)

add_executable(card_test card_test.cpp)
target_include_directories(card_test PRIVATE ${CMAKE_SOURCE_DIR}/games/cardGames/shared/includes)
target_link_libraries(card_test PRIVATE Catch2::Catch2WithMain)

include(CTest)
add_test(NAME card_test COMMAND card_test)
