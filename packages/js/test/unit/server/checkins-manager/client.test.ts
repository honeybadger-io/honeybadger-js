import { CheckinsClient } from '../../../../src/server/checkins-manager/client';
import { Checkin } from '../../../../src/server/checkins-manager/checkin';
import { nullLogger } from '../../helpers';
import nock from 'nock';
import { ServerTransport } from '../../../../src/server/transport';

describe('CheckinsClient', () => {
  it('should create a client', () => {
    const client = new CheckinsClient(new ServerTransport(), nullLogger())
    expect(client).toBeInstanceOf(CheckinsClient)
  })

  it('should list checkins for a project', async () => {
    const projectId = '11111'
    const request = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .reply(200, {
        results: [
          {
            id: 'uuid',
            name: 'a check-in',
            schedule_type: 'simple',
            report_period: 'weekly',
          }
        ]
      })
    const client = new CheckinsClient(new ServerTransport(), nullLogger())
    const checkins = await client.listForProject(projectId)
    expect(request.isDone()).toBe(true)
    expect(checkins).toHaveLength(1)
    expect(checkins[0].id).toEqual('uuid')
    expect(checkins[0].name).toEqual('a check-in')
    expect(checkins[0].scheduleType).toEqual('simple')
    expect(checkins[0].reportPeriod).toEqual('weekly')
  })

  it('should return list of checkins from cache for the same project', async () => {
    const projectId = '11111'
    const request = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .once()
      .reply(200, {
        results: [
          {
            id: 'uuid',
            name: 'a check-in',
            schedule_type: 'simple',
            report_period: 'weekly',
          }
        ]
      })
    const client = new CheckinsClient(new ServerTransport(), nullLogger())
    const checkins = await client.listForProject(projectId)
    expect(request.isDone()).toBe(true)
    const checkinsAgain = await client.listForProject(projectId)
    expect(checkins).toEqual(checkinsAgain);
  })

  it('should get a checkin', async () => {
    const projectId = '11111'
    const checkinId = '22222'

    const request = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins/${checkinId}`)
      .once()
      .reply(200, {
        id: 'uuid',
        name: 'a check-in',
        schedule_type: 'simple',
        report_period: 'weekly',
      })
    const client = new CheckinsClient(new ServerTransport(), nullLogger())
    const checkin = await client.get(projectId, checkinId)
    expect(request.isDone()).toBe(true)
    expect(checkin.id).toEqual('uuid')
    expect(checkin.name).toEqual('a check-in')
    expect(checkin.scheduleType).toEqual('simple')
    expect(checkin.reportPeriod).toEqual('weekly')
  })

  it('should create a checkin', async () => {
    const projectId = '11111'
    const checkinId = '22222'

    const checkinToBeSaved = new Checkin({
      projectId,
      name: 'a check-in',
      scheduleType: 'simple',
      reportPeriod: 'weekly',
    })

    const payload = checkinToBeSaved.asRequestPayload()
    const request = nock('https://app.honeybadger.io')
      .post(`/v2/projects/${projectId}/check_ins`, { check_in: payload })
      .once()
      .reply(201, {
        id: checkinId,
        ...payload,
      })
    const client = new CheckinsClient(new ServerTransport(), nullLogger())
    const checkin = await client.create(checkinToBeSaved)
    expect(request.isDone()).toBe(true)
    expect(checkin.id).toEqual(checkinId)
    expect(checkin.name).toEqual('a check-in')
    expect(checkin.scheduleType).toEqual('simple')
    expect(checkin.reportPeriod).toEqual('weekly')
  })

  it('should update a checkin', async () => {
    const projectId = '11111'
    const checkinId = '22222'

    const checkinToBeUpdated = new Checkin({
      projectId,
      id: checkinId,
      name: 'a check-in',
      scheduleType: 'simple',
      reportPeriod: 'weekly',
    })

    const payload = checkinToBeUpdated.asRequestPayload()
    const request = nock('https://app.honeybadger.io')
      .put(`/v2/projects/${projectId}/check_ins/${checkinId}`, { check_in: payload })
      .once()
      .reply(204, {
        id: checkinId,
        ...payload,
      })
    const client = new CheckinsClient(new ServerTransport(), nullLogger())
    const checkin = await client.update(checkinToBeUpdated)
    expect(request.isDone()).toBe(true)
    expect(checkin.id).toEqual(checkinId)
    expect(checkin.name).toEqual('a check-in')
    expect(checkin.scheduleType).toEqual('simple')
    expect(checkin.reportPeriod).toEqual('weekly')
  })

  it('should remove a checkin', async () => {
    const projectId = '11111'
    const checkinId = '22222'

    const checkinToBeRemoved = new Checkin({
      projectId,
      id: checkinId,
      name: 'a check-in',
      scheduleType: 'simple',
      reportPeriod: 'weekly',
    })

    const request = nock('https://app.honeybadger.io')
      .delete(`/v2/projects/${projectId}/check_ins/${checkinId}`)
      .once()
      .reply(204)

    const client = new CheckinsClient(new ServerTransport(), nullLogger())

    await client.remove(checkinToBeRemoved)
    expect(request.isDone()).toBe(true)
  })
})
