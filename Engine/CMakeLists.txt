cmake_minimum_required(VERSION 3.14)
project(Engine LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

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

find_package(gRPC REQUIRED)
find_package(Protobuf REQUIRED)

find_program(PROTOC protoc REQUIRED)
find_program(GRPC_CPP_PLUGIN grpc_cpp_plugin REQUIRED)

set(PROTO_FILE engine.proto)
set(PROTO_GEN_DIR ${CMAKE_BINARY_DIR}/generated)
file(MAKE_DIRECTORY ${PROTO_GEN_DIR})

set(PROTO_SOURCES
  ${PROTO_GEN_DIR}/engine.pb.cc
  ${PROTO_GEN_DIR}/engine.grpc.pb.cc
)

add_custom_command(
  OUTPUT ${PROTO_SOURCES}
  COMMAND ${PROTOC}
  ARGS --grpc_out=${PROTO_GEN_DIR}
       --cpp_out=${PROTO_GEN_DIR}
       -I ${CMAKE_SOURCE_DIR}
       --plugin=protoc-gen-grpc=${GRPC_CPP_PLUGIN}
       ${CMAKE_SOURCE_DIR}/${PROTO_FILE}
  DEPENDS ${CMAKE_SOURCE_DIR}/${PROTO_FILE}
  COMMENT "Generating gRPC/protobuf sources"
  VERBATIM
)

add_executable(engine
  main.cpp
  interface.cpp
  games/cardGames/shared/src/card.cpp
  games/cardGames/shared/src/deck.cpp
  games/cardGames/blackJack/src/hand.cpp
  games/cardGames/blackJack/src/game.cpp
  games/cardGames/blackJack/src/engine.cpp
  games/cardGames/texasHoldem/src/game.cpp
  games/cardGames/texasHoldem/src/player.cpp
  games/cardGames/texasHoldem/src/engine.cpp
  games/slotMachine/src/machines.cpp
  ${PROTO_SOURCES}
)

target_include_directories(engine PRIVATE
  games/cardGames/shared/includes
  games/cardGames/blackJack/includes
  games/cardGames/texasHoldem/includes
  games/slotMachine/includes
  ${PROTO_GEN_DIR}
)

target_link_libraries(engine PRIVATE
  gRPC::grpc++
  protobuf::libprotobuf
  glaze::glaze
)

enable_testing()
add_subdirectory(tests)
